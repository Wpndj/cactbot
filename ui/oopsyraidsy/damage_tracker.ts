import logDefinitions from '../../resources/netlog_defs';
import NetRegexes from '../../resources/netregexes';
import { addOverlayListener } from '../../resources/overlay_plugin_api';
import PartyTracker from '../../resources/party';
import { PlayerChangedDetail } from '../../resources/player_override';
import Regexes from '../../resources/regexes';
import { LocaleNetRegex } from '../../resources/translations';
import { jobToRole } from '../../resources/util';
import ZoneId from '../../resources/zone_id';
import ZoneInfo from '../../resources/zone_info';
import { OopsyData } from '../../types/data';
import { EventResponses } from '../../types/event';
import { Job, Role } from '../../types/job';
import { Matches, NetMatches } from '../../types/net_matches';
import { CactbotBaseRegExp } from '../../types/net_trigger';
import {
  LooseOopsyTrigger,
  LooseOopsyTriggerSet,
  MistakeMap,
  OopsyDeathReason,
  OopsyField,
  OopsyMistake,
  OopsyMistakeType,
  OopsyTrigger,
  OopsyTriggerField,
} from '../../types/oopsy';
import { ZoneIdType } from '../../types/trigger';

import { OopsyFileData } from './data/oopsy_manifest.txt';
import { EffectTracker } from './effect_tracker';
import { MistakeCollector } from './mistake_collector';
import {
  IsPlayerId,
  IsTriggerEnabled,
  kAttackFlags,
  kFieldFlags,
  kFlagInstantDeath,
  kShiftFlagValues,
  playerDamageFields,
  ShortNamify,
  Translate,
  UnscrambleDamage,
} from './oopsy_common';
import { OopsyOptions } from './oopsy_options';

const actorControlFadeInCommand = '40000010';

const isOopsyMistake = (x: OopsyMistake | OopsyDeathReason): x is OopsyMistake => 'type' in x;

type ProcessedOopsyTriggerSet = LooseOopsyTriggerSet & {
  filename?: string;
};

type ProcessedOopsyTrigger = LooseOopsyTrigger & {
  localRegex: RegExp;
};

export class DamageTracker {
  private triggerSets?: ProcessedOopsyTriggerSet[];
  private inCombat = false;
  private ignoreZone = false;
  private timers: number[] = [];
  private triggers: ProcessedOopsyTrigger[] = [];
  private partyTracker: PartyTracker;
  private effectTracker: EffectTracker;
  private countdownEngageRegex: RegExp;
  private countdownStartRegex: RegExp;
  private countdownCancelRegex: RegExp;
  private abilityFullRegex: CactbotBaseRegExp<'Ability'>;
  private lastDamage: { [name: string]: Partial<NetMatches['Ability']> } = {};
  private triggerSuppress: { [triggerId: string]: number } = {};
  private data: OopsyData;
  private timestampCallbacks: {
    timestamp: number;
    callback: () => void;
  }[] = [];

  private job: Job = 'NONE';
  private role: Role = 'none';
  private me?: string;
  private zoneName?: string;
  private zoneId: ZoneIdType = ZoneId.MatchAll;
  private contentType = 0;

  constructor(
    private options: OopsyOptions,
    private collector: MistakeCollector,
    private dataFiles: OopsyFileData,
  ) {
    this.partyTracker = new PartyTracker();
    addOverlayListener('PartyChanged', (e) => {
      this.partyTracker.onPartyChanged(e);
      this.effectTracker.OnPartyChanged();
    });
    const timestampCallback = (timestamp: number, callback: () => void) =>
      this.OnRequestTimestampCallback(timestamp, callback);
    this.effectTracker = new EffectTracker(
      this.options,
      this.partyTracker,
      this.collector,
      timestampCallback,
    );

    const lang = this.options.ParserLanguage;
    this.countdownEngageRegex = LocaleNetRegex.countdownEngage[lang] ||
      LocaleNetRegex.countdownEngage['en'];
    this.countdownStartRegex = LocaleNetRegex.countdownStart[lang] ||
      LocaleNetRegex.countdownStart['en'];
    this.countdownCancelRegex = LocaleNetRegex.countdownCancel[lang] ||
      LocaleNetRegex.countdownCancel['en'];
    this.abilityFullRegex = NetRegexes.abilityFull();

    this.data = this.GetDataObject();
    this.Reset();
  }

  OnRequestTimestampCallback(timestamp: number, callback: () => void): void {
    this.timestampCallbacks.push({
      timestamp: timestamp,
      callback: callback,
    });
    // Sort earliest to latest.
    this.timestampCallbacks.sort((a, b) => a.timestamp - b.timestamp);
  }

  GetDataObject(): OopsyData {
    return {
      me: this.me ?? '',
      job: this.job,
      role: this.role,
      party: this.partyTracker,
      inCombat: this.inCombat,
      ShortName: (name?: string) => ShortNamify(name, this.options.PlayerNicks),
      IsPlayerId: IsPlayerId,
      DamageFromMatches: (matches: NetMatches['Ability']) => UnscrambleDamage(matches?.damage),
      options: this.options,

      // Deprecated.
      ParseLocaleFloat: parseFloat,
    };
  }

  // TODO: this shouldn't clear timers and triggers
  // TODO: seems like some reloads are causing the /poke test to get undefined
  Reset(): void {
    this.data = this.GetDataObject();
    this.lastDamage = {};
    this.triggerSuppress = {};

    for (const timer of this.timers)
      window.clearTimeout(timer);
    this.timers = [];
  }

  OnNetLog(e: EventResponses['LogLine']): void {
    if (this.ignoreZone)
      return;

    const line = e.rawLine;
    for (const trigger of this.triggers) {
      const matches = trigger.localRegex.exec(line);
      if (matches)
        this.OnTrigger(trigger, matches);
    }

    const splitLine = e.line;
    const type = splitLine[logDefinitions.None.fields.type];

    // If we're waiting on a timestamp callback, check if any have passed with this line.
    // Ignore game log lines, which don't track milliseconds.
    if (type !== logDefinitions.GameLog.type) {
      let timestampCallback = this.timestampCallbacks[0];
      while (timestampCallback) {
        const timeField = splitLine[logDefinitions.None.fields.timestamp];
        if (!timeField)
          break;
        const thisTimestamp = new Date(timeField).getTime();
        if (thisTimestamp < timestampCallback.timestamp)
          break;

        timestampCallback.callback();
        this.timestampCallbacks.shift();
        timestampCallback = this.timestampCallbacks[0];
      }
    }

    switch (type) {
      case logDefinitions.GameLog.type:
        if (this.countdownEngageRegex.test(line))
          this.collector.AddEngage();
        if (this.countdownStartRegex.test(line) || this.countdownCancelRegex.test(line))
          this.collector.Reset();
        break;
      case logDefinitions.AddedCombatant.type:
        this.effectTracker.OnAddedCombatant(line, splitLine);
        break;
      case logDefinitions.Ability.type:
      case logDefinitions.NetworkAOEAbility.type:
        this.OnAbilityEvent(line, splitLine);
        this.effectTracker.OnAbility(line, splitLine);
        break;
      case logDefinitions.WasDefeated.type:
        this.OnDefeated(splitLine);
        this.effectTracker.OnDefeated(line, splitLine);
        break;
      case logDefinitions.GainsEffect.type:
        this.effectTracker.OnGainsEffect(line, splitLine);
        break;
      case logDefinitions.LosesEffect.type:
        this.effectTracker.OnLosesEffect(line, splitLine);
        break;
      case logDefinitions.ActorControl.type:
        if (splitLine[logDefinitions.ActorControl.fields.command] === actorControlFadeInCommand)
          this.effectTracker.OnWipe(line, splitLine);
        break;
    }
  }

  private OnDefeated(splitLine: string[]): void {
    const name = splitLine[logDefinitions.WasDefeated.fields.target];
    if (!name)
      return;

    const last = this.lastDamage[name];
    delete this.lastDamage[name];

    // Monsters get defeated as well, but they will never
    // have lastDamage marked for them.  It's possible that
    // in a very short fight, a player will never take
    // damage and will not get killed by an ability and
    // so won't get a death notice.

    // TODO: track all players in the instance and support
    // death notices even if there's no ability damage.
    if (last)
      this.collector.AddDeath(name, last);
  }

  private OnAbilityEvent(line: string, splitLine: string[]): void {
    // This is kind of obnoxious to have to regex match every ability line that's already split.
    // But, it turns it into a usable match object.
    const lineMatches = this.abilityFullRegex.exec(line);
    if (!lineMatches || !lineMatches.groups)
      return;

    const matches = lineMatches.groups;

    // Shift damage and flags forward for mysterious spurious :3E:0:.
    // Plenary Indulgence also appears to prepend confession stacks.
    // UNKNOWN: Can these two happen at the same time?
    const origFlags = splitLine[kFieldFlags];
    if (origFlags && kShiftFlagValues.includes(origFlags)) {
      matches.flags = splitLine[kFieldFlags + 2] ?? matches.flags;
      matches.damage = splitLine[kFieldFlags + 3] ?? matches.damage;
    }

    // Length 1 or 2.
    let lowByte = matches.flags.substr(-2);
    if (lowByte.length === 1)
      lowByte = '0' + lowByte;

    if (!kAttackFlags.includes(lowByte))
      return;

    // TODO track first puller here, collector doesn't need every damage line
    if (!this.collector.firstPuller)
      this.collector.AddDamage(matches);

    if (IsPlayerId(matches.targetId))
      this.lastDamage[matches.target] = matches;
  }

  AddImpliedDeathReason(obj?: OopsyDeathReason): void {
    if (!obj || !obj.name)
      return;
    this.lastDamage[obj.name] = {
      target: obj.name,
      ability: Translate(this.options.DisplayLanguage, obj.text),
      flags: kFlagInstantDeath,
      damage: '0',
    };
  }

  OnTrigger(trigger: LooseOopsyTrigger, execMatches: RegExpExecArray): void {
    const triggerTime = Date.now();

    // TODO: turn this into a helper?? this was copied/pasted from popup-text.js

    // If using named groups, treat matches.groups as matches
    // so triggers can do things like matches.target.
    let matches: Matches = {};
    // If using named groups, treat matches.groups as matches
    // so triggers can do things like matches.target.
    if (execMatches?.groups) {
      matches = execMatches.groups;
    } else if (execMatches) {
      // If there are no matching groups, reproduce the old js logic where
      // groups ended up as the original RegExpExecArray object
      execMatches.forEach((value, idx) => {
        matches[idx] = value;
      });
    }

    if (trigger.id) {
      if (!IsTriggerEnabled(this.options, trigger.id))
        return;

      if (trigger.id in this.triggerSuppress) {
        const suppressTime = this.triggerSuppress[trigger.id];
        if (suppressTime && suppressTime > triggerTime)
          return;
        delete this.triggerSuppress[trigger.id];
      }
    }

    const ValueOrFunction = (
      f: OopsyTriggerField<OopsyData, Matches, OopsyField>,
      matches: Matches,
    ) => {
      return (typeof f === 'function') ? f(this.data, matches) : f;
    };

    if ('condition' in trigger) {
      const condition = ValueOrFunction(trigger.condition, matches);
      if (!condition)
        return;
    }

    const delay = 'delaySeconds' in trigger ? ValueOrFunction(trigger.delaySeconds, matches) : 0;

    const suppress = 'suppressSeconds' in trigger
      ? ValueOrFunction(trigger.suppressSeconds, matches)
      : 0;
    if (trigger.id && typeof suppress === 'number' && suppress > 0)
      this.triggerSuppress[trigger.id] = triggerTime + (suppress * 1000);

    const f = (() => {
      if ('mistake' in trigger) {
        const m = ValueOrFunction(trigger.mistake, matches);
        if (typeof m === 'object') {
          if (Array.isArray(m)) {
            for (let i = 0; i < m.length; ++i)
              this.collector.OnMistakeObj(m[i]);
          } else if (isOopsyMistake(m)) {
            this.collector.OnMistakeObj(m);
          }
        }
      }
      if ('deathReason' in trigger) {
        const ret = ValueOrFunction(trigger.deathReason, matches);
        if (ret && typeof ret === 'object' && !Array.isArray(ret)) {
          if (!isOopsyMistake(ret))
            this.AddImpliedDeathReason(ret);
        }
      }
      if ('run' in trigger)
        ValueOrFunction(trigger.run, matches);
    });

    if (!delay || typeof delay !== 'number')
      f();
    else
      this.timers.push(window.setTimeout(f, delay * 1000));
  }

  OnPartyWipeEvent(): void {
    if (this.ignoreZone)
      return;
    this.Reset();
    this.collector.OnPartyWipeEvent();
  }

  OnChangeZone(e: EventResponses['ChangeZone']): void {
    this.zoneName = e.zoneName;
    this.zoneId = e.zoneID;

    const zoneInfo = ZoneInfo[this.zoneId];
    this.contentType = zoneInfo?.contentType ?? 0;

    this.effectTracker.OnChangeZone(e);
    this.ReloadTriggers();
  }

  OnInCombatChangedEvent(e: EventResponses['onInCombatChangedEvent']): void {
    this.inCombat = e.detail.inGameCombat;
    this.data.inCombat = this.inCombat;
  }

  private AddSimpleTriggers(type: OopsyMistakeType, dict?: MistakeMap): void {
    if (!dict)
      return;
    for (const key in dict) {
      const id = dict[key];
      const trigger: OopsyTrigger<OopsyData> = {
        id: key,
        type: 'Ability',
        netRegex: NetRegexes.abilityFull({ id: id, ...playerDamageFields }),
        mistake: (_data, matches) => {
          return { type: type, blame: matches.target, text: matches.ability };
        },
      };
      this.ProcessTrigger(trigger);
    }
  }

  private AddGainsEffectTriggers(type: OopsyMistakeType, dict?: MistakeMap): void {
    if (!dict)
      return;
    for (const key in dict) {
      const id = dict[key];
      const trigger: OopsyTrigger<OopsyData> = {
        id: key,
        type: 'GainsEffect',
        netRegex: NetRegexes.gainsEffect({ effectId: id }),
        mistake: (_data, matches) => {
          return { type: type, blame: matches.target, text: matches.effect };
        },
      };
      this.ProcessTrigger(trigger);
    }
  }

  // Helper function for "double tap" shares where multiple players share
  // damage when it should only be on one person, such as a spread mechanic.
  AddShareTriggers(type: OopsyMistakeType, dict?: MistakeMap): void {
    if (!dict)
      return;
    for (const key in dict) {
      const id = dict[key];
      const trigger: OopsyTrigger<OopsyData> = {
        id: key,
        type: 'Ability',
        netRegex: NetRegexes.abilityFull({ type: '22', id: id, ...playerDamageFields }),
        mistake: (_data, matches) => {
          return {
            type: type,
            blame: matches.target,
            text: {
              en: `${matches.ability} (share)`,
              de: `${matches.ability} (geteilt)`,
              fr: `${matches.ability}`, // FIXME
              ja: `${matches.ability}`, // FIXME
              cn: `${matches.ability} (重叠)`,
              ko: `${matches.ability} (쉐어)`,
            },
          };
        },
      };
      this.ProcessTrigger(trigger);
    }
  }

  AddSoloTriggers(type: OopsyMistakeType, dict?: MistakeMap): void {
    if (!dict)
      return;
    for (const key in dict) {
      const id = dict[key];
      const trigger: OopsyTrigger<OopsyData> = {
        id: key,
        type: 'Ability',
        netRegex: NetRegexes.abilityFull({ type: '21', id: id, ...playerDamageFields }),
        mistake: (_data, matches) => {
          return {
            type: type,
            blame: matches.target,
            text: {
              en: `${matches.ability} (alone)`,
              de: `${matches.ability} (allein)`,
              fr: `${matches.ability} (seul(e))`,
              ja: `${matches.ability} (一人)`,
              cn: `${matches.ability} (单吃)`,
              ko: `${matches.ability} (혼자 맞음)`,
            },
          };
        },
      };
      this.ProcessTrigger(trigger);
    }
  }

  ReloadTriggers(): void {
    this.ProcessDataFiles();

    // Wait for datafiles / jobs / zone events / localization.
    if (!this.triggerSets || !this.me || !this.zoneName)
      return;

    this.Reset();

    this.triggers = [];

    this.ignoreZone = this.options.IgnoreContentTypes.includes(this.contentType) ||
      this.options.IgnoreZoneIds.includes(this.zoneId);
    if (this.ignoreZone)
      return;

    for (const set of this.triggerSets) {
      if ('zoneId' in set) {
        if (
          set.zoneId !== ZoneId.MatchAll && set.zoneId !== this.zoneId &&
          !(typeof set.zoneId === 'object' && set.zoneId.includes(this.zoneId))
        )
          continue;
      } else if ('zoneRegex' in set) {
        const zoneError = (s: string) => {
          console.error(`${s}: ${JSON.stringify(set.zoneRegex)} in ${set.filename ?? '???'}`);
        };

        let zoneRegex = set.zoneRegex;
        if (typeof zoneRegex !== 'object') {
          zoneError('zoneRegex must be translatable object or regexp');
          continue;
        } else if (!(zoneRegex instanceof RegExp)) {
          const parserLang = this.options.ParserLanguage || 'en';
          if (parserLang in zoneRegex) {
            zoneRegex = zoneRegex[parserLang];
          } else if ('en' in zoneRegex) {
            zoneRegex = zoneRegex['en'];
          } else {
            zoneError('unknown zoneRegex language');
            continue;
          }

          if (!(zoneRegex instanceof RegExp)) {
            zoneError('zoneRegex must be regexp');
            continue;
          }
        }

        if (this.zoneName.search(Regexes.parse(zoneRegex)) < 0)
          continue;
      } else {
        return;
      }

      if (this.options.Debug) {
        if (set.filename)
          console.log(`Loading ${set.filename}`);
        else
          console.log('Loading user triggers for zone');
      }

      this.AddSimpleTriggers('warn', set.damageWarn);
      this.AddSimpleTriggers('fail', set.damageFail);
      this.AddGainsEffectTriggers('warn', set.gainsEffectWarn);
      this.AddGainsEffectTriggers('fail', set.gainsEffectFail);
      this.AddShareTriggers('warn', set.shareWarn);
      this.AddShareTriggers('fail', set.shareFail);
      this.AddSoloTriggers('warn', set.soloWarn);
      this.AddSoloTriggers('fail', set.soloFail);

      for (const trigger of set.triggers ?? [])
        this.ProcessTrigger(trigger);
    }
  }

  ProcessTrigger(trigger: OopsyTrigger<OopsyData>): void {
    // This is a bit of a hack, but LooseOopsyTrigger extends OopsyTrigger<OopsyData>
    // but not vice versa.  Because the NetMatches['Ability'] requires a number
    // of fields, Matches cannot be assigned to Matches & NetMatches['Ability'].
    const looseTrigger = trigger as LooseOopsyTrigger;

    const regex = looseTrigger.netRegex;
    // Some oopsy triggers (e.g. early pull) have only an id.
    if (!regex)
      return;
    this.triggers.push({
      ...looseTrigger,
      localRegex: Regexes.parse(Array.isArray(regex) ? Regexes.anyOf(regex) : regex),
    });
  }

  OnPlayerChange(e: PlayerChangedDetail): void {
    if (this.job === e.detail.job && this.me === e.detail.name)
      return;

    this.me = e.detail.name;
    this.job = e.detail.job;
    this.role = jobToRole(this.job);
    this.ReloadTriggers();
  }

  ProcessDataFiles(): void {
    // Only run this once.
    if (this.triggerSets)
      return;
    if (!this.me)
      return;

    this.triggerSets = this.options.Triggers;
    for (const [filename, json] of Object.entries<LooseOopsyTriggerSet>(this.dataFiles)) {
      if (typeof json !== 'object') {
        console.error('Unexpected JSON from ' + filename + ', expected an object');
        continue;
      }
      const hasZoneRegex = 'zoneRegex' in json;
      const hasZoneId = 'zoneId' in json;
      if (!hasZoneRegex && !hasZoneId || hasZoneRegex && hasZoneId) {
        console.error('Unexpected JSON from ' + filename + ', need one of zoneRegex/zoneID');
        continue;
      }

      if ('triggers' in json) {
        if (typeof json.triggers !== 'object' || !(json.triggers.length >= 0)) {
          console.error('Unexpected JSON from ' + filename + ', expected triggers to be an array');
          continue;
        }
      }

      const set = {
        filename: filename,
        ...json,
      };
      this.triggerSets.push(set);
    }
    this.ReloadTriggers();
  }
}
