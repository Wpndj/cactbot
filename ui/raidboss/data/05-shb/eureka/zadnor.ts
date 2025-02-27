import Conditions from '../../../../../resources/conditions';
import NetRegexes from '../../../../../resources/netregexes';
import Outputs from '../../../../../resources/outputs';
import { Responses } from '../../../../../resources/responses';
import ZoneId from '../../../../../resources/zone_id';
import { RaidbossData } from '../../../../../types/data';
import { NetMatches } from '../../../../../types/net_matches';
import { TriggerSet } from '../../../../../types/trigger';

export interface Data extends RaidbossData {
  ce?: string;
  serpentsTurbineCount?: number;
  feelingAnalysis?: boolean;
  diremiteHailfire?: string[];
  timeBombCount?: number;
  sartauvoirPyrocrisis?: string[];
  saunionSwoopingCount?: number;
  diabloDealingCount?: number;
  diabloPillar?: string[];
}

// CE explainer: https://www.youtube.com/watch?v=L4lXAV_OD-0

// TODO: snake: everything
// TODO: blade: everything
// TODO: lyon: everything
// TODO: blood: Flight of the Malefic cleaves
// TODO: blood: gaze vs line attack from adds
// TODO: wolf: 6x Imaginifers cast thermal gust hitting east/west (only seen east at -828...-808)
// TODO: cavalry: early call for knockback direction?
// TODO: calalry: is Ride Down explainable??
// TODO: time: is it possible to find where slow clocks are?
// TODO: machines: can describe initial safe quadrant from first charges?
// TODO: machines: can describe "diagonal line bomb" safe spot
// TODO: machines: can determine rotating corner to go to
// TODO: alkonost: foreshadowing (both in CE and Dalraida)
// TODO: alkonost: :Tamed Alkonost:5F26:Stormcall: can be knockback to/away fast/slow orbs
// TODO: hallway: left/right lasers (check getCombatants???)
// TODO: saunion: are the mobile halo / crossray abilities corresponding to directions?
// TODO: diablo: diabolic gate directional callouts???
// TODO: diablo: improve timing on acceleration bomb

// List of events:
// https://github.com/xivapi/ffxiv-datamining/blob/master/csv/DynamicEvent.csv
//
// These ids are (unfortunately) gathered by hand and don't seem to correlate
// to any particular bits of data.  However, there's a game log message when you
// register for a CE and an 0x21 message with this id when you accept and
// teleport in.  This avoids having to translate all of these names and also
// guarantees that the player is actually in the CE for the purpose of
// filtering triggers.
const ceIds = {
  // On Serpents' Wings
  serpents: '211',
  // Feeling the Burn
  feeling: '20E',
  // The Broken Blade
  blade: '21F',
  // From Beyond the Grave
  grave: '21B',
  // With Diremite and Main
  diremite: '221',
  // Here Comes the Cavalry
  cavalry: '21C',
  // Head of the Snake
  snake: '21E',
  // There Would Be Blood
  blood: '210',
  // Never Cry Wolf
  wolf: '20F',
  // Time To Burn
  time: '21D',
  // Lean, Mean, Magitek Machines
  machines: '218',
  // Worn to a Shadow
  shadow: '222',
  // A Familiar Face
  face: '212',
  // Looks to Die For
  looks: '207',
  // Taking the Lyon's Share
  lyon: '220',
  // The Dalriada
  dalriada: '213',
  dalriadaCuchulainn: '214',
  dalriadaHallway: '215',
  dalriadaSaunion: '216',
  dalriadaDiablo: '217',
};

const limitCutHeadmarkers = ['004F', '0050', '0051', '0052'];

// TODO: promote something like this to Conditions?
const tankBusterOnParty = (ceName?: string) =>
  (data: Data, matches: NetMatches['StartsUsing']) => {
    if (ceName && data.ce !== ceName)
      return false;
    if (matches.target === data.me)
      return true;
    if (data.role !== 'healer')
      return false;
    return data.party.inParty(matches.target);
  };

const triggerSet: TriggerSet<Data> = {
  zoneId: ZoneId.Zadnor,
  timelineFile: 'zadnor.txt',
  resetWhenOutOfCombat: false,
  triggers: [
    {
      id: 'Zadnor Falling Asleep',
      type: 'GameLog',
      netRegex: NetRegexes.gameLog({ line: '7 minutes have elapsed since your last activity..*?', capture: false }),
      netRegexDe: NetRegexes.gameLog({ line: 'Seit deiner letzten Aktivität sind 7 Minuten vergangen..*?', capture: false }),
      netRegexFr: NetRegexes.gameLog({ line: 'Votre personnage est inactif depuis 7 minutes.*?', capture: false }),
      netRegexJa: NetRegexes.gameLog({ line: '操作がない状態になってから7分が経過しました。.*?', capture: false }),
      netRegexCn: NetRegexes.gameLog({ line: '已经7分钟没有进行任何操作.*?', capture: false }),
      netRegexKo: NetRegexes.gameLog({ line: '7분 동안 아무 조작을 하지 않았습니다..*?', capture: false }),
      response: Responses.wakeUp(),
    },
    {
      id: 'Zadnor Critical Engagement',
      type: 'ActorControl',
      netRegex: NetRegexes.network6d({ command: '80000014' }),
      run: (data, matches) => {
        // This fires when you win, lose, or teleport out.
        if (matches.data0 === '00') {
          if (data.ce && data.options.Debug)
            console.log(`Stop CE: ${data.ce}`);
          // Stop any active timelines.
          data.StopCombat();
          // Prevent further triggers for any active CEs from firing.
          delete data.ce;
          return;
        }

        delete data.ce;
        const ceId = matches.data0.toUpperCase();
        const anonCEs: { [key: string]: string } = ceIds;
        for (const key in anonCEs) {
          if (anonCEs[key] === ceId) {
            if (data.options.Debug)
              console.log(`Start CE: ${key} (${ceId})`);
            data.ce = key;
            return;
          }
        }

        if (data.options.Debug)
          console.log(`Start CE: ??? (${ceId})`);
      },
    },
    // ***** On Serpents' Wings *****
    {
      id: 'Zadnor Serpents Turbine',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Stormborne Zirnitra', id: '5E54' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sturm-Zirnitra', id: '5E54' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Zirnitra Des Tempêtes', id: '5E54' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ストーム・ジルニトラ', id: '5E54' }),
      netRegexCn: NetRegexes.startsUsing({ source: '暴风札尼尔查妖蛇', id: '5E54' }),
      netRegexKo: NetRegexes.startsUsing({ source: 'Stormborne Zirnitra', id: '5E54' }),
      condition: (data) => data.ce === 'serpents',
      preRun: (data) => data.serpentsTurbineCount = (data.serpentsTurbineCount ?? 0) + 1,
      delaySeconds: (_data, matches) => parseFloat(matches.castTime) - 5,
      alertText: (data, _matches, output) => {
        // TODO: how does this loop?
        if (data.serpentsTurbineCount === 1)
          return output.knockbackDonut!();
        else if (data.serpentsTurbineCount === 2)
          return output.knockbackIntoCircle!();
        else if (data.serpentsTurbineCount === 3)
          return output.knockbackExplosion!();
        else if (data.serpentsTurbineCount === 4)
          return output.knockbackDonut!();
        else if (data.serpentsTurbineCount === 5)
          return output.knockbackIntoSafe!();
      },
      outputStrings: {
        knockbackDonut: {
          en: 'Knockback + Stack Donuts Middle',
          de: 'Rückstoß + Donuts mittig sammeln',
          cn: '击退 + 月环集合击退',
          ko: '넉백 + 도넛장판 피하기',
        },
        knockbackIntoCircle: {
          en: 'Knockback (towards first circles)',
          de: 'Rückstoß (zu den ersten Kreisen)',
          cn: '向第一个圈圈击退',
          ko: '먼저 뜬 장판으로 넉백',
        },
        knockbackIntoSafe: {
          en: 'Knockback (towards open spots)',
          de: 'Rückstoß (zum offenen Bereich)',
          cn: '向空缺位置击退',
          ko: '안전지대로 넉백',
        },
        knockbackExplosion: {
          // Can't trust people to make a safe spot,
          // so using knockback prevention is probably the best advice.
          en: 'Knockback (prevent)',
          de: 'Rückstoß (verhindern)',
          cn: '防击退',
          ko: '넉백 (거리유지 추천)',
        },
      },
    },
    // ***** Feeling the Burn *****
    {
      id: 'Zadnor Feeling Suppressive Magitek Rays',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Blackburn', id: '5C40', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Schwarzbrand', id: '5C40', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Escarre', id: '5C40', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ブラックバーン', id: '5C40', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '黑色燃焰', id: '5C40', capture: false }),
      condition: (data) => data.ce === 'feeling',
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Feeling Chain Cannon You',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({ id: '00A4' }),
      condition: (data, matches) => data.ce === 'feeling' && data.me === matches.target,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Chain Cannon on YOU',
          de: 'Kettenkanone auf DIR',
          cn: '直线点名',
          ko: '체인 캐논 대상자',
        },
      },
    },
    {
      id: 'Zadnor Feeling Chain Cannon Not You',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({ id: '00A4', capture: false }),
      condition: (data) => data.ce === 'feeling',
      delaySeconds: 3,
      suppressSeconds: 1,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Stay Out of Lasers',
          de: 'Aus den Lasern gehen',
          cn: '避开直线点名',
          ko: '레이저 피하기',
        },
      },
    },
    {
      id: 'Zadnor Feeling Analysis',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Blackburn', id: '5C37', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Schwarzbrand', id: '5C37', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Escarre', id: '5C37', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ブラックバーン', id: '5C37', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '黑色燃焰', id: '5C37', capture: false }),
      condition: (data) => data.ce === 'feeling',
      run: (data) => data.feelingAnalysis = true,
    },
    {
      id: 'Zadnor Feeling Read Orders Coordinated Assault',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Blackburn', id: '5C34', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Schwarzbrand', id: '5C34', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Escarre', id: '5C34', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ブラックバーン', id: '5C34', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '黑色燃焰', id: '5C34', capture: false }),
      condition: (data) => data.ce === 'feeling',
      alertText: (data, _matches, output) => {
        return data.feelingAnalysis ? output.point!() : output.dodge!();
      },
      run: (data) => delete data.feelingAnalysis,
      outputStrings: {
        dodge: {
          en: 'Dodge 4 Charges',
          de: 'Weiche 4 Anstürmen aus',
          cn: '躲避4次冲锋',
          ko: '4방향 돌진 피하기',
        },
        point: {
          en: 'Point at 4 Charges',
          de: 'Zeige auf dir 4 Anstürmen',
          cn: '瞄准4次冲锋',
          ko: '4방향 돌진 피하기',
        },
      },
    },
    // ***** The Broken Blade *****
    // ***** From Beyond the Grave *****
    {
      id: 'Zadnor Grave Soul Purge',
      type: 'StartsUsing',
      // 5E23 = get out first
      // 5E25 = get in first
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Shemhazai', id: ['5E23', '5E25'] }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Shemhazai Der Iv\\. Legion', id: ['5E23', '5E25'] }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Shemhazai De La 4E Légion', id: ['5E23', '5E25'] }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・シュミハザ', id: ['5E23', '5E25'] }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团谢米哈扎', id: ['5E23', '5E25'] }),
      condition: (data) => data.ce === 'grave',
      suppressSeconds: 10,
      alertText: (_data, matches, output) => {
        return matches.id === '5E23' ? output.outThenIn!() : output.inThenOut!();
      },
      outputStrings: {
        outThenIn: Outputs.outThenIn,
        inThenOut: Outputs.inThenOut,
      },
    },
    {
      id: 'Zadnor Grave Soul Purge Second',
      type: 'StartsUsing',
      // 5E23 = get out first (so get in second)
      // 5E25 = get in first (so get out second)
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Shemhazai', id: ['5E23', '5E25'] }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Shemhazai Der Iv\\. Legion', id: ['5E23', '5E25'] }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Shemhazai De La 4E Légion', id: ['5E23', '5E25'] }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・シュミハザ', id: ['5E23', '5E25'] }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团谢米哈扎', id: ['5E23', '5E25'] }),
      condition: (data) => data.ce === 'grave',
      delaySeconds: 5,
      suppressSeconds: 10,
      alertText: (_data, matches, output) => {
        return matches.id === '5E23' ? output.in!() : output.out!();
      },
      outputStrings: {
        out: Outputs.out,
        in: Outputs.in,
      },
    },
    {
      id: 'Zadnor Grave Devour Soul',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Shemhazai', id: '5E20' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Shemhazai Der Iv\\. Legion', id: '5E20' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Shemhazai De La 4E Légion', id: '5E20' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・シュミハザ', id: '5E20' }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团谢米哈扎', id: '5E20' }),
      condition: tankBusterOnParty('grave'),
      response: Responses.tankBuster(),
    },
    {
      id: 'Zadnor Grave Blight',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Shemhazai', id: '5E1E', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Shemhazai Der Iv\\. Legion', id: '5E1E', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Shemhazai De La 4E Légion', id: '5E1E', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・シュミハザ', id: '5E1E', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团谢米哈扎', id: '5E1E', capture: false }),
      condition: (data) => data.ce === 'grave',
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Grave Crimson Blade',
      type: 'AddedCombatant',
      netRegex: NetRegexes.addedCombatantFull({ npcNameId: '9934', capture: false }),
      condition: (data) => data.ce === 'grave',
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Get Behind Hernais',
          de: 'Geh hinter Hernais',
          cn: '去腐犬背后',
          ko: 'Hernais 뒤로',
        },
      },
    },
    {
      id: 'Zadnor Grave War Wraith',
      type: 'AddedCombatant',
      netRegex: NetRegexes.addedCombatantFull({ npcNameId: '9933', capture: false }),
      condition: (data) => data.ce === 'grave',
      // They hang out on the outside for a bit and then become targetable.
      delaySeconds: 11.5,
      suppressSeconds: 10,
      response: Responses.killAdds(),
    },
    {
      id: 'Zadnor Grave Aethertide',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Dyunbu The Accursed', id: '5E2A' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Dyunbu (?:der|die|das) Unlauter(?:e|er|es|en)', id: '5E2A' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Dyunbu L\'Impure', id: '5E2A' }),
      netRegexJa: NetRegexes.startsUsing({ source: '不浄のユンブ', id: '5E2A' }),
      netRegexCn: NetRegexes.startsUsing({ source: '污身秽心 尤恩布', id: '5E2A' }),
      condition: (data, matches) => data.ce === 'grave' && data.me === matches.target,
      response: Responses.spread(),
    },
    {
      id: 'Zadnor Grave Forced March',
      type: 'GainsEffect',
      // 871 = Forward March
      // 872 = About Face
      // 873 = Left Face
      // 874 = Right Face
      netRegex: NetRegexes.gainsEffect({ source: '4th-Make Shemhazai', effectId: ['871', '872', '873', '874'] }),
      netRegexDe: NetRegexes.gainsEffect({ source: 'Shemhazai Der Iv\\. Legion', effectId: ['871', '872', '873', '874'] }),
      netRegexFr: NetRegexes.gainsEffect({ source: 'Shemhazai De La 4E Légion', effectId: ['871', '872', '873', '874'] }),
      netRegexJa: NetRegexes.gainsEffect({ source: 'Ivレギオン・シュミハザ', effectId: ['871', '872', '873', '874'] }),
      netRegexCn: NetRegexes.gainsEffect({ source: '第四军团谢米哈扎', effectId: ['871', '872', '873', '874'] }),
      condition: (data, matches) => data.ce === 'grave' && data.me === matches.target,
      alertText: (_data, matches, output) => {
        const effectId = matches.effectId.toUpperCase();
        if (effectId === '871')
          return output.forward!();
        if (effectId === '872')
          return output.backward!();
        if (effectId === '873')
          return output.left!();
        if (effectId === '874')
          return output.right!();
      },
      outputStrings: {
        forward: {
          en: 'March Forward Into Middle',
          de: 'Marchiere Vorwärts in die Mitte',
          cn: '强制移动: 前，去中间',
          ko: '정신장악: 앞, 가운데로',
        },
        backward: {
          en: 'March Backward Into Middle',
          de: 'Marchiere Rückwärts in die Mitte',
          cn: '强制移动: 后，去中间',
          ko: '정신장악: 뒤, 가운데로',
        },
        left: {
          en: 'March Left Into Middle',
          de: 'Marchiere Links in die Mitte',
          cn: '强制移动: 左，去中间',
          ko: '정신장악: 왼쪽, 가운데로',
        },
        right: {
          en: 'March Right Into Middle',
          de: 'Marchiere Rechts in die Mitte',
          cn: '强制移动: 右，去中间',
          ko: '정신장악: 오른쪽, 가운데로',
        },
      },
    },
    // ***** With Diremite and Main *****
    {
      id: 'Zadnor Diremite Crystal Needle',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hedetet', id: '5E15' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hedetet', id: '5E15' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hededèt', id: '5E15' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ヘデテト', id: '5E15' }),
      netRegexCn: NetRegexes.startsUsing({ source: '赫德提特', id: '5E15' }),
      netRegexKo: NetRegexes.startsUsing({ source: '헤데테트', id: '5E15' }),
      condition: tankBusterOnParty('diremite'),
      response: Responses.tankBuster(),
    },
    {
      id: 'Zadnor Diremite Shardstrike',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hedetet', id: '5E17' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hedetet', id: '5E17' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hededèt', id: '5E17' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ヘデテト', id: '5E17' }),
      netRegexCn: NetRegexes.startsUsing({ source: '赫德提特', id: '5E17' }),
      netRegexKo: NetRegexes.startsUsing({ source: '헤데테트', id: '5E17' }),
      condition: (data, matches) => data.ce === 'diremite' && data.me === matches.target,
      response: Responses.spread(),
    },
    {
      id: 'Zadnor Diremite Hailfire You',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({ id: limitCutHeadmarkers }),
      condition: (data, matches) => data.ce === 'diremite' && data.me === matches.target,
      preRun: (data, matches) => {
        data.diremiteHailfire ??= [];
        data.diremiteHailfire.push(matches.target);
      },
      alertText: (_data, matches, output) => {
        const id = matches.id;
        const num = limitCutHeadmarkers.indexOf(id) + 1;
        if (num < 1)
          return;
        const numStr = output[`num${num}`]!();
        return output.text!({ num: numStr });
      },
      outputStrings: {
        num1: Outputs.num1,
        num2: Outputs.num2,
        num3: Outputs.num3,
        num4: Outputs.num4,
        text: {
          en: '${num} (spread for laser)',
          de: '${num} (verteile für Laser)',
          cn: '${num} (激光分散)',
          ko: '${num} (레이저 대비 산개)',
        },
      },
    },
    {
      id: 'Zadnor Diremite Hailfire Not You',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({ id: limitCutHeadmarkers, capture: false }),
      condition: (data) => data.ce === 'diremite',
      delaySeconds: 0.5,
      suppressSeconds: 1,
      infoText: (data, _matches, output) => {
        if (data.diremiteHailfire && !data.diremiteHailfire.includes(data.me))
          return output.text!();
      },
      run: (data) => delete data.diremiteHailfire,
      outputStrings: {
        text: {
          en: 'Avoid Lasers',
          de: 'Laser ausweichen',
          fr: 'Évitez les lasers',
          ja: 'レーザーを避ける',
          cn: '躲避激光',
          ko: '레이저 피하기',
        },
      },
    },
    {
      id: 'Zadnor Diremite Crystaline Stingers',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hedetet', id: '5E0D', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hedetet', id: '5E0D', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hededèt', id: '5E0D', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ヘデテト', id: '5E0D', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '赫德提特', id: '5E0D', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '헤데테트', id: '5E0D', capture: false }),
      condition: (data) => data.ce === 'diremite',
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Hide Behind Silver Shard',
          de: 'Hinter Silber-Splitter verstecken',
          cn: '躲在银色碎片后',
          ko: '은색 샤드 뒤로',
        },
      },
    },
    {
      id: 'Zadnor Diremite Aetherial Stingers',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hedetet', id: '5E0E', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hedetet', id: '5E0E', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hededèt', id: '5E0E', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ヘデテト', id: '5E0E', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '赫德提特', id: '5E0E', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '헤데테트', id: '5E0E', capture: false }),
      condition: (data) => data.ce === 'diremite',
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Hide Behind Gold Shard',
          de: 'Hinter Gold-Splitter verstecken',
          cn: '躲在金色碎片后',
          ko: '금색 샤드 뒤로',
        },
      },
    },
    {
      id: 'Zadnor Diremite Sand Sphere',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hedetet', id: '5E0F', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hedetet', id: '5E0F', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hededèt', id: '5E0F', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ヘデテト', id: '5E0F', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '赫德提特', id: '5E0F', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '헤데테트', id: '5E0F', capture: false }),
      condition: (data) => data.ce === 'diremite',
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Away From Orbs',
          de: 'Weg von den Orbs',
          cn: '远离球球',
          ko: '구체 피하기',
        },
      },
    },
    // ***** Here Comes the Cavalry *****
    {
      id: 'Zadnor Cavalry Gust Slash',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D7D' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D7D' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D7D' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'クリバナリウス', id: '5D7D' }),
      netRegexCn: NetRegexes.startsUsing({ source: '铠甲重骑兵', id: '5D7D' }),
      condition: (data) => data.ce === 'cavalry',
      delaySeconds: (_data, matches) => parseFloat(matches.castTime) - 5,
      response: Responses.knockback(),
    },
    {
      id: 'Zadnor Cavalry Raw Steel',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D87' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D87' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D87' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'クリバナリウス', id: '5D87' }),
      netRegexCn: NetRegexes.startsUsing({ source: '铠甲重骑兵', id: '5D87' }),
      condition: (data) => data.ce === 'cavalry',
      response: (data, matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          avoidCharge: {
            en: 'Avoid Charge',
            de: 'ausweichen',
            fr: 'Évitez les charges',
            ja: '突進避けて',
            cn: '躲避冲锋',
            ko: '돌진 피하기',
          },
          runAway: {
            en: 'Run Away From Boss',
            de: 'Renn weg vom Boss',
            fr: 'Courez loin du boss',
            ja: 'ボスから離れる',
            cn: '远离Boss',
            ko: '보스와 거리 벌리기',
          },
        };

        if (matches.target === data.me)
          return { alertText: output.runAway!() };
        return { infoText: output.avoidCharge!() };
      },
    },
    {
      id: 'Zadnor Cavalry Call Raze',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D8C', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D8C', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D8C', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'クリバナリウス', id: '5D8C', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '铠甲重骑兵', id: '5D8C', capture: false }),
      condition: (data) => data.ce === 'cavalry',
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Cavalry Magitek Blaster',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D90' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D90' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Clibanarius', id: '5D90' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'クリバナリウス', id: '5D90' }),
      netRegexCn: NetRegexes.startsUsing({ source: '铠甲重骑兵', id: '5D90' }),
      condition: (data) => data.ce === 'cavalry',
      response: Responses.stackMarkerOn(),
    },
    // ***** Head of the Snake *****
    // ***** There Would Be Blood *****
    {
      id: 'Zadnor Blood Cloud Of Locusts',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hanbi', id: '5C10', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hanbi', id: '5C10', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hanbi', id: '5C10', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ハンビ', id: '5C10', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '汉比', id: '5C10', capture: false }),
      condition: (data) => data.ce === 'blood',
      response: Responses.getOut(),
    },
    {
      id: 'Zadnor Blood Plague Of Locusts',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hanbi', id: '5C11', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hanbi', id: '5C11', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hanbi', id: '5C11', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ハンビ', id: '5C11', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '汉比', id: '5C11', capture: false }),
      condition: (data) => data.ce === 'blood',
      response: Responses.getIn(),
    },
    {
      id: 'Zadnor Blood Dread Wind',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hanbi', id: '5BAE', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hanbi', id: '5BAE', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hanbi', id: '5BAE', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ハンビ', id: '5BAE', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '汉比', id: '5BAE', capture: false }),
      condition: (data) => data.ce === 'blood',
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Blood Gale Cannon',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hanbi', id: '53E3', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hanbi', id: '53E3', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hanbi', id: '53E3', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ハンビ', id: '53E3', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '汉比', id: '53E3', capture: false }),
      condition: (data) => data.ce === 'blood',
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          // TODO: should this be a response/output?
          en: 'Out of Front',
          de: 'Weg von Vorne',
          cn: '避开正面',
          ko: '정면 피하기',
        },
      },
    },
    {
      id: 'Zadnor Blood Camisado',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hanbi', id: '5BAE' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hanbi', id: '5BAE' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hanbi', id: '5BAE' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ハンビ', id: '5BAE' }),
      netRegexCn: NetRegexes.startsUsing({ source: '汉比', id: '5BAE' }),
      condition: tankBusterOnParty('blood'),
      response: Responses.tankBuster(),
    },
    // ***** Never Cry Wolf *****
    {
      id: 'Zadnor Wolf Glaciation',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hrodvitnir', id: '5C32', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hrodvitnir', id: '5C32', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hródvitnir', id: '5C32', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'フローズヴィトニル', id: '5C32', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '恶名苍狼', id: '5C32', capture: false }),
      condition: (data) => data.ce === 'wolf',
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Wolf Storm Without',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hrodvitnir', id: '5C2A', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hrodvitnir', id: '5C2A', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hródvitnir', id: '5C2A', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'フローズヴィトニル', id: '5C2A', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '恶名苍狼', id: '5C2A', capture: false }),
      condition: (data) => data.ce === 'wolf',
      response: Responses.getUnder(),
    },
    {
      id: 'Zadnor Wolf Storm Within',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hrodvitnir', id: '5C2C', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hrodvitnir', id: '5C2C', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hródvitnir', id: '5C2C', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'フローズヴィトニル', id: '5C2C', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '恶名苍狼', id: '5C2C', capture: false }),
      condition: (data) => data.ce === 'wolf',
      response: Responses.getOut(),
    },
    {
      id: 'Zadnor Wolf Bracing Wind',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Ice Sprite', id: '5C22' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Eis-Exergon', id: '5C22' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Élémentaire De Glace', id: '5C22' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アイススプライト', id: '5C22' }),
      netRegexCn: NetRegexes.startsUsing({ source: '冰元精', id: '5C22' }),
      condition: (data) => data.ce === 'wolf',
      delaySeconds: (_data, matches) => parseFloat(matches.castTime) - 5,
      suppressSeconds: 5,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Knockback (behind pillar)',
          de: 'Rückstoß (hinter dem Eissplitter)',
          cn: '击退到柱子后',
          ko: '기둥 뒤로 넉백',
        },
      },
    },
    {
      id: 'Zadnor Wolf Lunar Cry',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Hrodvitnir', id: '5C24', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hrodvitnir', id: '5C24', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hródvitnir', id: '5C24', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'フローズヴィトニル', id: '5C24', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '恶名苍狼', id: '5C24', capture: false }),
      condition: (data) => data.ce === 'wolf',
      // Call this out after Bracing Wind.
      delaySeconds: 9,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Hide Behind Pillar',
          de: 'Hinter dem Eissplitter verstecken',
          cn: '躲在柱子后',
          ko: '기둥 뒤로',
        },
      },
    },
    // ***** Time To Burn *****
    {
      id: 'Zadnor Time Fire IV',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Belias', id: '5D9A' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Belias Der Iv\\. Legion', id: '5D9A' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Bélias De La 4E Légion', id: '5D9A' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・ベリアス', id: '5D9A' }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团贝利亚斯', id: '5D9A' }),
      condition: (data) => data.ce === 'time',
      response: Responses.tankBuster(),
    },
    {
      id: 'Zadnor Time Fire',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Belias', id: '5D99' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Belias Der Iv\\. Legion', id: '5D99' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Bélias De La 4E Légion', id: '5D99' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・ベリアス', id: '5D99' }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团贝利亚斯', id: '5D99' }),
      condition: tankBusterOnParty('time'),
      response: Responses.tankBuster(),
    },
    {
      id: 'Zadnor Time Reproduce',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Belias', id: '60E9', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Belias Der Iv\\. Legion', id: '60E9', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Bélias De La 4E Légion', id: '60E9', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・ベリアス', id: '60E9', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团贝利亚斯', id: '60E9', capture: false }),
      condition: (data) => data.ce === 'time',
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Avoid Dashes',
          de: 'Sprint ausweichen',
          fr: 'Évitez les charges',
          ja: 'ブレードを避ける',
          cn: '躲开冲锋',
          ko: '돌진 피하기',
        },
      },
    },
    {
      id: 'Zadnor Time Time Bomb',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Belias', id: '5D95', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Belias Der Iv\\. Legion', id: '5D95', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Bélias De La 4E Légion', id: '5D95', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・ベリアス', id: '5D95', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团贝利亚斯', id: '5D95', capture: false }),
      condition: (data) => data.ce === 'time',
      infoText: (data, _matches, output) => {
        data.timeBombCount = (data.timeBombCount ?? 0) + 1;
        // Belias alternates 2 and 3 Time Bombs, starting with 2.
        return data.timeBombCount % 2 ? output.twoClocks!() : output.threeClocks!();
      },
      outputStrings: {
        twoClocks: {
          en: 'Go Perpendicular To Clock Hands',
          de: 'Geh Senkrecht von den Uhrzeigern',
          cn: '垂直于时钟指针移动',
          ko: '시계바늘 직각으로 이동',
        },
        threeClocks: {
          // This is...not the best instruction.  The real instruction is "if all clock hands are
          // parallel then go perpendicular, HOWEVER if exactly one clock hand is perpendicular
          // to the other two, then go where it points", which is several novels too long for
          // trigger text.  However, given that we explain two clocks, it feels wrong to not
          // have a trigger for three clocks.  "Mechanics Are Happening <se.6>"
          en: 'Dodge Three Clocks',
          de: 'Weiche den 3 Uhren aus',
          cn: '躲避3个时钟',
        },
      },
    },
    // ***** Lean, Mean, Magitek Machines *****
    {
      id: 'Zadnor Machines Magnetic Field',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Kampe', id: '5CFE', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Kampe', id: '5CFE', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Campé', id: '5CFE', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'カンペ', id: '5CFE', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '坎珀', id: '5CFE', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Machines Fore-Hind Cannons',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Kampe', id: '5CFF', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Kampe', id: '5CFF', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Campé', id: '5CFF', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'カンペ', id: '5CFF', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '坎珀', id: '5CFF', capture: false }),
      response: Responses.goSides(),
    },
    // ***** Worn to a Shadow *****
    {
      id: 'Zadnor Shadow Bladed Beak',
      type: 'StartsUsing',
      // Not a cleave.
      netRegex: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E3B' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E3B' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E3B' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アルコノスト', id: '5E3B' }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿尔科诺斯特', id: '5E3B' }),
      condition: tankBusterOnParty('shadow'),
      response: Responses.tankBuster(),
    },
    {
      id: 'Zadnor Shadow Nihility\'s Song',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E3C', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E3C', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E3C', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アルコノスト', id: '5E3C', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿尔科诺斯特', id: '5E3C', capture: false }),
      condition: (data) => data.ce === 'shadow',
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Shadow Stormcall',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E39', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E39', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E39', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アルコノスト', id: '5E39', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿尔科诺斯特', id: '5E39', capture: false }),
      condition: (data) => data.ce === 'shadow',
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Follow Slow Orb',
          de: 'Folge dem langsamen Orb',
          cn: '跟随慢速球',
          ko: '느린 구체 따라가기',
        },
      },
    },
    {
      id: 'Zadnor Shadow Stormcall Away',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E39', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E39', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Alkonost', id: '5E39', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アルコノスト', id: '5E39', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿尔科诺斯特', id: '5E39', capture: false }),
      condition: (data) => data.ce === 'shadow',
      delaySeconds: 15,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Away From Orb',
          de: 'Weg vom Orb',
          cn: '远离球球',
          ko: '구체 피하기',
        },
      },
    },
    // ***** A Familiar Face *****
    {
      id: 'Zadnor Face Ancient Quake IV',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Hashmal', id: '5D14', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hashmallim Der Iv\\. Legion', id: '5D14', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hashmal De La 4E Légion', id: '5D14', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・ハシュマリム', id: '5D14', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团哈修马利姆', id: '5D14', capture: false }),
      condition: (data) => data.ce === 'face',
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Face Rock Cutter',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Hashmal', id: '5D13' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hashmallim Der Iv\\. Legion', id: '5D13' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Hashmal De La 4E Légion', id: '5D13' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・ハシュマリム', id: '5D13' }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团哈修马利姆', id: '5D13' }),
      condition: tankBusterOnParty('face'),
      response: Responses.tankBuster(),
    },
    {
      id: 'Zadnor Face Extreme Edge Left',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Phantom Hashmal', id: '5D0E', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hashmallims Abbild', id: '5D0E', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Double Du Hashmal', id: '5D0E', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ハシュマリムの幻影', id: '5D0E', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '哈修马利姆的幻影', id: '5D0E', capture: false }),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Find Phantom; Dodge Left',
          de: 'Finde das Abbild; weiche Links aus',
          cn: '寻找幻影; 向左躲避',
          ko: '분신 찾고, 왼쪽으로 피하기',
        },
      },
    },
    {
      id: 'Zadnor Face Extreme Edge Right',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Phantom Hashmal', id: '5D0D', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Hashmallims Abbild', id: '5D0D', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Double Du Hashmal', id: '5D0D', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ハシュマリムの幻影', id: '5D0D', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '哈修马利姆的幻影', id: '5D0D', capture: false }),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Find Phantom; Dodge Right',
          de: 'Finde das Abbild; weiche Rechts aus',
          cn: '寻找幻影; 向右躲避',
          ko: '분신 찾고, 오른쪽으로 피하기',
        },
      },
    },
    {
      id: 'Zadnor Face Hammer Round',
      type: 'Ability',
      netRegex: NetRegexes.ability({ source: '4th-Make Hashmal', id: '5D10', capture: false }),
      netRegexDe: NetRegexes.ability({ source: 'Hashmallim Der Iv\\. Legion', id: '5D10', capture: false }),
      netRegexFr: NetRegexes.ability({ source: 'Hashmal De La 4E Légion', id: '5D10', capture: false }),
      netRegexJa: NetRegexes.ability({ source: 'Ivレギオン・ハシュマリム', id: '5D10', capture: false }),
      netRegexCn: NetRegexes.ability({ source: '第四军团哈修马利姆', id: '5D10', capture: false }),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Away From Hammer; Rotate Outside',
          de: 'Weg vom Hammer; nach Außen rotieren',
          cn: '远离锤子; 向外旋转',
          ko: '기둥으로부터 피하고, 계속 돌기',
        },
      },
    },
    // ***** Looks to Die For *****
    {
      id: 'Zadnor Looks Forelash',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Ayida', id: '5DA9', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Ayida', id: '5DA9', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Ayida', id: '5DA9', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アイダ', id: '5DA9', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿依达', id: '5DA9', capture: false }),
      condition: (data) => data.ce === 'looks',
      response: Responses.getBehind(),
    },
    {
      id: 'Zadnor Looks Backlash',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Ayida', id: '5DAA', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Ayida', id: '5DAA', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Ayida', id: '5DAA', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アイダ', id: '5DAA', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿依达', id: '5DAA', capture: false }),
      condition: (data) => data.ce === 'looks',
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          // TODO: should this be a response/output?
          en: 'Get In Front',
          de: 'Geh vor den Boss',
          fr: 'Soyez devant',
          ja: 'ボスの正面へ',
          cn: '去Boss正面',
          ko: '정면에 서기',
        },
      },
    },
    {
      id: 'Zadnor Looks Twisting Winds',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Ayida', id: '5DA2', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Ayida', id: '5DA2', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Ayida', id: '5DA2', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アイダ', id: '5DA2', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿依达', id: '5DA2', capture: false }),
      condition: (data) => data.ce === 'looks',
      response: Responses.goSides(),
    },
    {
      id: 'Zadnor Looks Roar',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Ayida', id: '5DAD', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Ayida', id: '5DAD', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Ayida', id: '5DAD', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アイダ', id: '5DAD', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿依达', id: '5DAD', capture: false }),
      condition: (data) => data.ce === 'looks',
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Looks Serpent\'s Edge',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Ayida', id: '5DB1' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Ayida', id: '5DB1' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Ayida', id: '5DB1' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アイダ', id: '5DB1' }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿依达', id: '5DB1' }),
      condition: tankBusterOnParty('looks'),
      response: Responses.tankBuster(),
    },
    {
      id: 'Zadnor Looks Levinbolt',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Ayida', id: '5DB0' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Ayida', id: '5DB0' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Ayida', id: '5DB0' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アイダ', id: '5DB0' }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿依达', id: '5DB0' }),
      condition: (data, matches) => data.ce === 'looks' && data.me === matches.target,
      response: Responses.spread(),
    },
    {
      id: 'Zadnor Looks Thundercall',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Ayida', id: '5D9C', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Ayida', id: '5D9C', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Ayida', id: '5D9C', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アイダ', id: '5D9C', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿依达', id: '5D9C', capture: false }),
      condition: (data) => data.ce === 'looks',
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Avoid Orbs -> Under Orbs',
          de: 'Weiche Orbs aus -> Unter die Orbs',
          cn: '避开球 -> 去球下',
          ko: '구체 피하기 -> 구체 밑으로',
        },
      },
    },
    {
      id: 'Zadnor Looks Flame',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Ayida', id: '5DA6', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Ayida', id: '5DA6', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Ayida', id: '5DA6', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アイダ', id: '5DA6', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿依达', id: '5DA6', capture: false }),
      condition: (data) => data.ce === 'looks',
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          // TODO: this is also an aoe, and this is a pretty poor description.
          en: 'Go to small orb',
          de: 'Geh zum kleinen Orb',
          cn: '去小球',
          ko: '작은 구체쪽으로',
        },
      },
    },
    // ***** Taking the Lyon's Share *****
    // ***** The Dalriada *****
    {
      id: 'Zadnor Sartauvoir Pyrokinesis',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Sartauvoir The Inferno', id: '5E7D', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sartauvoir Eisenfeuer', id: '5E7D', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Sartauvoir Le Fer Rouge', id: '5E7D', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '鉄火のサルトヴォアール', id: '5E7D', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '铁胆狱火 萨托瓦尔', id: '5E7D', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '쇳불의 사르토부아르', id: '5E7D', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Sartauvoir Time Eruption',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Sartauvoir The Inferno', id: ['5E6C', '5E83'], capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sartauvoir Eisenfeuer', id: ['5E6C', '5E83'], capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Sartauvoir Le Fer Rouge', id: ['5E6C', '5E83'], capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '鉄火のサルトヴォアール', id: ['5E6C', '5E83'], capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '铁胆狱火 萨托瓦尔', id: ['5E6C', '5E83'], capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '쇳불의 사르토부아르', id: ['5E6C', '5E83'], capture: false }),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Go to Slow Clocks',
          de: 'Geh zu den langsamen Uhren',
          cn: '去慢时钟',
          ko: '느린 시계로',
        },
      },
    },
    {
      id: 'Zadnor Sartauvoir Reverse Time Eruption',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Sartauvoir The Inferno', id: ['5E6D', '5E84'], capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sartauvoir Eisenfeuer', id: ['5E6D', '5E84'], capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Sartauvoir Le Fer Rouge', id: ['5E6D', '5E84'], capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '鉄火のサルトヴォアール', id: ['5E6D', '5E84'], capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '铁胆狱火 萨托瓦尔', id: ['5E6D', '5E84'], capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '쇳불의 사르토부아르', id: ['5E6D', '5E84'], capture: false }),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Go to Fast Clocks',
          de: 'Geh zu den schnellen Uhren',
          cn: '去快时钟',
          ko: '빠른 시계로',
        },
      },
    },
    {
      id: 'Zadnor Sartauvoir Phenex',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Sartauvoir The Inferno', id: ['5E72', '5E85'], capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sartauvoir Eisenfeuer', id: ['5E72', '5E85'], capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Sartauvoir Le Fer Rouge', id: ['5E72', '5E85'], capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '鉄火のサルトヴォアール', id: ['5E72', '5E85'], capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '铁胆狱火 萨托瓦尔', id: ['5E72', '5E85'], capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '쇳불의 사르토부아르', id: ['5E72', '5E85'], capture: false }),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Bird Dashes',
          de: 'Vogel-Anstürme',
          cn: '躲避红鸟',
          ko: '붉은새 피하기',
        },
      },
    },
    {
      id: 'Zadnor Sartauvoir Hyperpyroplexy',
      type: 'Ability',
      netRegex: NetRegexes.ability({ source: 'Sartauvoir The Inferno', id: '5E76', capture: false }),
      netRegexDe: NetRegexes.ability({ source: 'Sartauvoir Eisenfeuer', id: '5E76', capture: false }),
      netRegexFr: NetRegexes.ability({ source: 'Sartauvoir Le Fer Rouge', id: '5E76', capture: false }),
      netRegexJa: NetRegexes.ability({ source: '鉄火のサルトヴォアール', id: '5E76', capture: false }),
      netRegexCn: NetRegexes.ability({ source: '铁胆狱火 萨托瓦尔', id: '5E76', capture: false }),
      netRegexKo: NetRegexes.ability({ source: '쇳불의 사르토부아르', id: '5E76', capture: false }),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Get Towers',
          de: 'Türme nehmen',
          fr: 'Prenez les tours',
          ja: '塔を踏む',
          cn: '踩塔',
          ko: '장판 하나씩 들어가기',
        },
      },
    },
    {
      id: 'Zadnor Sartauvoir Burning Blade',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Sartauvoir The Inferno', id: '5E90' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sartauvoir Eisenfeuer', id: '5E90' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Sartauvoir Le Fer Rouge', id: '5E90' }),
      netRegexJa: NetRegexes.startsUsing({ source: '鉄火のサルトヴォアール', id: '5E90' }),
      netRegexCn: NetRegexes.startsUsing({ source: '铁胆狱火 萨托瓦尔', id: '5E90' }),
      netRegexKo: NetRegexes.startsUsing({ source: '쇳불의 사르토부아르', id: '5E90' }),
      condition: tankBusterOnParty(),
      response: Responses.tankBuster(),
    },
    {
      id: 'Zadnor Sartauvoir Pyrocrisis',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Sartauvoir The Inferno', id: '5E8F' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sartauvoir Eisenfeuer', id: '5E8F' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Sartauvoir Le Fer Rouge', id: '5E8F' }),
      netRegexJa: NetRegexes.startsUsing({ source: '鉄火のサルトヴォアール', id: '5E8F' }),
      netRegexCn: NetRegexes.startsUsing({ source: '铁胆狱火 萨托瓦尔', id: '5E8F' }),
      netRegexKo: NetRegexes.startsUsing({ source: '쇳불의 사르토부아르', id: '5E8F' }),
      preRun: (data, matches) => {
        data.sartauvoirPyrocrisis ??= [];
        data.sartauvoirPyrocrisis.push(matches.target);
      },
      alertText: (data, matches, output) => {
        if (data.me === matches.target)
          return output.text!();
      },
      outputStrings: {
        text: Outputs.spread,
      },
    },
    {
      id: 'Zadnor Sartauvoir Pyrodoxy',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Sartauvoir The Inferno', id: '5E8E' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sartauvoir Eisenfeuer', id: '5E8E' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Sartauvoir Le Fer Rouge', id: '5E8E' }),
      netRegexJa: NetRegexes.startsUsing({ source: '鉄火のサルトヴォアール', id: '5E8E' }),
      netRegexCn: NetRegexes.startsUsing({ source: '铁胆狱火 萨托瓦尔', id: '5E8E' }),
      netRegexKo: NetRegexes.startsUsing({ source: '쇳불의 사르토부아르', id: '5E8E' }),
      delaySeconds: 0.5,
      infoText: (data, matches, output) => {
        if (data.me === matches.target)
          return output.stackOnYou!();
        if (data.sartauvoirPyrocrisis && !data.sartauvoirPyrocrisis.includes(data.me))
          return output.stackOnTarget!({ player: data.ShortName(matches.target) });
      },
      run: (data) => delete data.sartauvoirPyrocrisis,
      outputStrings: {
        stackOnYou: Outputs.stackOnYou,
        stackOnTarget: Outputs.stackOnPlayer,
      },
    },
    {
      id: 'Zadnor Sartauvoir Mannatheihwon Flame Warning',
      type: 'Ability',
      // Triggered after Burning Blade.
      // TODO: does this ever happen again??
      netRegex: NetRegexes.ability({ source: 'Sartauvoir The Inferno', id: '5E90', capture: false }),
      netRegexDe: NetRegexes.ability({ source: 'Sartauvoir Eisenfeuer', id: '5E90', capture: false }),
      netRegexFr: NetRegexes.ability({ source: 'Sartauvoir Le Fer Rouge', id: '5E90', capture: false }),
      netRegexJa: NetRegexes.ability({ source: '鉄火のサルトヴォアール', id: '5E90', capture: false }),
      netRegexCn: NetRegexes.ability({ source: '铁胆狱火 萨托瓦尔', id: '5E90', capture: false }),
      netRegexKo: NetRegexes.ability({ source: '쇳불의 사르토부아르', id: '5E90', capture: false }),
      suppressSeconds: 999999,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Stack together to bait Ignis Est',
          de: 'Versammeln um Ignis Est zu ködern',
          cn: '集合诱导是为烈火',
          ko: '보스 앞으로 집합',
        },
      },
    },
    {
      id: 'Zadnor Sartauvoir Mannatheihwon Flame',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Sartauvoir The Inferno', id: '5E87', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sartauvoir Eisenfeuer', id: '5E87', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Sartauvoir Le Fer Rouge', id: '5E87', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '鉄火のサルトヴォアール', id: '5E87', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '铁胆狱火 萨托瓦尔', id: '5E87', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '쇳불의 사르토부아르', id: '5E87', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Sartauvoir Mannatheihwon Flame Away',
      type: 'Ability',
      netRegex: NetRegexes.ability({ source: 'Sartauvoir The Inferno', id: '5E87', capture: false }),
      netRegexDe: NetRegexes.ability({ source: 'Sartauvoir Eisenfeuer', id: '5E87', capture: false }),
      netRegexFr: NetRegexes.ability({ source: 'Sartauvoir Le Fer Rouge', id: '5E87', capture: false }),
      netRegexJa: NetRegexes.ability({ source: '鉄火のサルトヴォアール', id: '5E87', capture: false }),
      netRegexCn: NetRegexes.ability({ source: '铁胆狱火 萨托瓦尔', id: '5E87', capture: false }),
      netRegexKo: NetRegexes.ability({ source: '쇳불의 사르토부아르', id: '5E87', capture: false }),
      suppressSeconds: 1,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Get far away from X charges',
          de: 'Weit weg von den X Anstürmen',
          cn: '远离X冲锋',
          ko: 'X자에서 멀리 떨어지기',
        },
      },
    },
    {
      id: 'Zadnor Sartauvoir Left Brand',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Sartauvoir The Inferno', id: '5E8C', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sartauvoir Eisenfeuer', id: '5E8C', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Sartauvoir Le Fer Rouge', id: '5E8C', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '鉄火のサルトヴォアール', id: '5E8C', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '铁胆狱火 萨托瓦尔', id: '5E8C', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '쇳불의 사르토부아르', id: '5E8C', capture: false }),
      response: Responses.goRight(),
    },
    {
      id: 'Zadnor Sartauvoir Right Brand',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Sartauvoir The Inferno', id: '5E8B', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Sartauvoir Eisenfeuer', id: '5E8B', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Sartauvoir Le Fer Rouge', id: '5E8B', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '鉄火のサルトヴォアール', id: '5E8B', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '铁胆狱火 萨托瓦尔', id: '5E8B', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '쇳불의 사르토부아르', id: '5E8B', capture: false }),
      response: Responses.goLeft(),
    },
    {
      id: 'Zadnor Blackburn Magitek Rays',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th Legion Blackburn', id: '5F12', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Schwarzbrand Der Iv\\. Legion', id: '5F12', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Escarre De La 4E Légion', id: '5F12', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・ブラックバーン', id: '5F12', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团黑色燃焰', id: '5F12', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Blackburn Analysis',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th Legion Blackburn', id: '5F0F', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Schwarzbrand Der Iv\\. Legion', id: '5F0F', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Escarre De La 4E Légion', id: '5F0F', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・ブラックバーン', id: '5F0F', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团黑色燃焰', id: '5F0F', capture: false }),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Opening Toward Undodgeable Line',
          de: 'Öffnen in Richtung der nicht ausweichbaren Linie',
          cn: '开口朝向无法躲避的线',
        },
      },
    },
    {
      id: 'Zadnor Blackburn Augur Sanctified Quake III',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '5F20', capture: false }),
      suppressSeconds: 1,
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Augur Pyroplexy',
      type: 'Ability',
      netRegex: NetRegexes.ability({ source: '4th Legion Augur', id: '5F1B', capture: false }),
      netRegexDe: NetRegexes.ability({ source: 'Augur Der Iv\\. Legion', id: '5F1B', capture: false }),
      netRegexFr: NetRegexes.ability({ source: 'Augure De La 4E Légion', id: '5F1B', capture: false }),
      netRegexJa: NetRegexes.ability({ source: 'Ivレギオン・アウグル', id: '5F1B', capture: false }),
      netRegexCn: NetRegexes.ability({ source: '第四军团先知', id: '5F1B', capture: false }),
      netRegexKo: NetRegexes.ability({ source: 'Iv군단 점쟁이', id: '5F1B', capture: false }),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Get Towers',
          de: 'Türme nehmen',
          fr: 'Prenez les tours',
          ja: '塔を踏む',
          cn: '踩塔',
          ko: '장판 하나씩 들어가기',
        },
      },
    },
    {
      id: 'Zadnor Augur Turbine',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Flameborne Zirnitra', id: '5F14' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Flammen-Zirnitra', id: '5F14' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Zirnitra Des Flammes', id: '5F14' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'フレイム・ジルニトラ', id: '5F14' }),
      netRegexCn: NetRegexes.startsUsing({ source: '火焰札尼尔查妖蛇', id: '5F14' }),
      netRegexKo: NetRegexes.startsUsing({ source: 'Flameborne Zirnitra', id: '5F14' }),
      delaySeconds: (_data, matches) => parseFloat(matches.castTime) - 5,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Stack + Knockback to Safe Spot',
          de: 'Sammeln + Rückstoß in den sicheren Bereich',
          cn: '集合 + 向安全区击退',
          ko: '집합 + 안전장소로 넉백',
        },
      },
    },
    {
      id: 'Zadnor Alkonost Wind',
      type: 'StartsUsing',
      // 5F21 = North Wind
      // 5F22 = South Wind
      netRegex: NetRegexes.startsUsing({ source: 'Tamed Carrion Crow', id: ['5F21', '5F22'] }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Gebändigt(?:e|er|es|en) Aaskrähe', id: ['5F21', '5F22'] }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Corneille Noire Dressée', id: ['5F21', '5F22'] }),
      netRegexJa: NetRegexes.startsUsing({ source: 'テイムド・キャリオンクロウ', id: ['5F21', '5F22'] }),
      netRegexCn: NetRegexes.startsUsing({ source: '驯服食腐鸦', id: ['5F21', '5F22'] }),
      netRegexKo: NetRegexes.startsUsing({ source: '길들여진 송장까마귀', id: ['5F21', '5F22'] }),
      delaySeconds: (_data, matches) => parseFloat(matches.castTime) - 5,
      response: Responses.knockback(),
    },
    {
      id: 'Zadnor Alkonost Stormcall Away',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Tamed Alkonost', id: '5F26', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Gebändigt(?:e|er|es|en) Alkonost', id: '5F26', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Alkonost Dressé', id: '5F26', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'テイムド・アルコノスト', id: '5F26', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '驯服阿尔科诺斯特', id: '5F26', capture: false }),
      delaySeconds: 18,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Away From Orb',
          de: 'Weg vom Orb',
          cn: '远离球球',
          ko: '오브 피하기',
        },
      },
    },
    {
      id: 'Zadnor Alkonost Nihility\'s Song',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Alkonost', id: '5F28', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Alkonost', id: '5F28', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Alkonost', id: '5F28', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'アルコノスト', id: '5F28', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '阿尔科诺斯特', id: '5F28', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Cuchulainn March',
      type: 'GainsEffect',
      // 871 = Forward March
      // 872 = About Face
      // 873 = Left Face
      // 874 = Right Face
      netRegex: NetRegexes.gainsEffect({ source: '4th-Make Cuchulainn', effectId: ['871', '872', '873', '874'] }),
      netRegexDe: NetRegexes.gainsEffect({ source: 'Cuchulainn Der Iv\\. Legion', effectId: ['871', '872', '873', '874'] }),
      netRegexFr: NetRegexes.gainsEffect({ source: 'Cúchulainn De La 4E Légion', effectId: ['871', '872', '873', '874'] }),
      netRegexJa: NetRegexes.gainsEffect({ source: 'Ivレギオン・キュクレイン', effectId: ['871', '872', '873', '874'] }),
      netRegexCn: NetRegexes.gainsEffect({ source: '第四军团丘库雷因', effectId: ['871', '872', '873', '874'] }),
      condition: Conditions.targetIsYou(),
      alertText: (_data, matches, output) => {
        const effectId = matches.effectId.toUpperCase();
        if (effectId === '871')
          return output.forward!();
        if (effectId === '872')
          return output.backward!();
        if (effectId === '873')
          return output.left!();
        if (effectId === '874')
          return output.right!();
      },
      outputStrings: {
        forward: {
          en: 'March Forward (avoid puddles)',
          de: 'Marchiere Vorwärts (weiche den Flächen aus)',
          cn: '强制移动: 前, 避开圈圈',
          ko: '정신장악: 앞, 장판 피하기',
        },
        backward: {
          en: 'March Backward (avoid puddles)',
          de: 'Marchiere Rückwärts (weiche den Flächen aus)',
          cn: '强制移动: 后, 避开圈圈',
          ko: '정신장악: 뒤, 장판 피하기',
        },
        left: {
          en: 'March Left (avoid puddles)',
          de: 'Marchiere Links (weiche den Flächen aus)',
          cn: '强制移动: 左, 避开圈圈',
          ko: '정신장악: 왼쪽, 장판 피하기',
        },
        right: {
          en: 'March Right (avoid puddles)',
          de: 'Marchiere Rehts (weiche den Flächen aus)',
          cn: '强制移动: 右, 避开圈圈',
          ko: '정신장악: 오른쪽, 장판 피하기',
        },
      },
    },
    {
      id: 'Zadnor Cuchulainn Might Of Malice',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Cuchulainn', id: '5C92' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Cuchulainn Der Iv\\. Legion', id: '5C92' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Cúchulainn De La 4E Légion', id: '5C92' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・キュクレイン', id: '5C92' }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团丘库雷因', id: '5C92' }),
      condition: tankBusterOnParty(),
      response: Responses.tankBuster(),
    },
    {
      id: 'Zadnor Cuchulainn Putrified Soul',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Cuchulainn', id: '5C8F', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Cuchulainn Der Iv\\. Legion', id: '5C8F', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Cúchulainn De La 4E Légion', id: '5C8F', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・キュクレイン', id: '5C8F', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团丘库雷因', id: '5C8F', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Cuchulainn Fleshy Necromass',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Cuchulainn', id: '5C82', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Cuchulainn Der Iv\\. Legion', id: '5C82', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Cúchulainn De La 4E Légion', id: '5C82', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・キュクレイン', id: '5C82', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团丘库雷因', id: '5C82', capture: false }),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Get In Puddle',
          de: 'Geh in die Flächen',
          cn: '进入圈圈',
          ko: '검은 장판으로',
        },
      },
    },
    {
      id: 'Zadnor Cuchulainn Necrotic Billow',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Cuchulainn', id: '5C86', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Cuchulainn Der Iv\\. Legion', id: '5C86', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Cúchulainn De La 4E Légion', id: '5C86', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・キュクレイン', id: '5C86', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团丘库雷因', id: '5C86', capture: false }),
      // Normally wouldn't call out ground markers, but this can look a lot like Ambient Pulsation.
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Avoid Chasing AOEs',
          de: 'Weiche den verfolgenden AoEs aus',
          cn: '躲避追踪AOE',
          ko: '장판 피하기',
        },
      },
    },
    {
      id: 'Zadnor Cuchulainn Ambient Pulsation',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: '4th-Make Cuchulainn', id: '5C8E', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Cuchulainn Der Iv\\. Legion', id: '5C8E', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Cúchulainn De La 4E Légion', id: '5C8E', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'Ivレギオン・キュクレイン', id: '5C8E', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '第四军团丘库雷因', id: '5C8E', capture: false }),
      suppressSeconds: 10,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          // TODO: this is "titan line bombs".  Is there a better wording here?
          en: 'Go to third line',
          de: 'Geh zur 3. Linie',
          cn: '去第三行',
          ko: '세번째 장판으로',
        },
      },
    },
    {
      id: 'Zadnor Cuchulainn Fell Flow',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({ id: '0028' }),
      condition: (data, matches) => data.ce === 'dalriadaCuchulainn' && data.me === matches.target,
      response: Responses.earthshaker(),
    },
    {
      id: 'Zadnor Saunion High-Powered Magitek Ray',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Saunion', id: '5DC5' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Saunion', id: '5DC5' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Saunion', id: '5DC5' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'サウニオン', id: '5DC5' }),
      netRegexCn: NetRegexes.startsUsing({ source: '桑尼恩', id: '5DC5' }),
      response: Responses.tankCleave(),
    },
    {
      id: 'Zadnor Saunion Magitek Halo',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Saunion', id: '5DB5', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Saunion', id: '5DB5', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Saunion', id: '5DB5', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'サウニオン', id: '5DB5', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '桑尼恩', id: '5DB5', capture: false }),
      response: Responses.getUnder(),
    },
    {
      id: 'Zadnor Saunion Magitek Crossray',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Saunion', id: '5DB7', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Saunion', id: '5DB7', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Saunion', id: '5DB7', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'サウニオン', id: '5DB7', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '桑尼恩', id: '5DB7', capture: false }),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Go Intercardinals',
          de: 'Geh zu Interkardinalen Richtungen',
          cn: '去四角',
          ko: '대각선으로',
        },
      },
    },
    {
      id: 'Zadnor Saunion Mobile Halo',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Saunion', id: ['5DB9', '5DBA', '5DBB', '5DBC'], capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Saunion', id: ['5DB9', '5DBA', '5DBB', '5DBC'], capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Saunion', id: ['5DB9', '5DBA', '5DBB', '5DBC'], capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'サウニオン', id: ['5DB9', '5DBA', '5DBB', '5DBC'], capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '桑尼恩', id: ['5DB9', '5DBA', '5DBB', '5DBC'], capture: false }),
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Get Under (towards charge)',
          de: 'Geh unter den Boss (zum Ansturm hin)',
          cn: '去下方 (朝向冲锋方向)',
          ko: '보스 밑으로 (방향 확인)',
        },
      },
    },
    {
      id: 'Zadnor Saunion Mobile Crossray',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Saunion', id: ['5DBD', '5DBE', '5DBF', '5DC0'], capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Saunion', id: ['5DBD', '5DBE', '5DBF', '5DC0'], capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Saunion', id: ['5DBD', '5DBE', '5DBF', '5DC0'], capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'サウニオン', id: ['5DBD', '5DBE', '5DBF', '5DC0'], capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '桑尼恩', id: ['5DBD', '5DBE', '5DBF', '5DC0'], capture: false }),
      suppressSeconds: 5,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Go Intercards (away from charge)',
          de: 'Geh zu Interkardinalen Richtungen (weg vom Ansturm)',
          cn: '去四角 (躲避冲锋)',
          ko: '대각선으로 (방향 확인)',
        },
      },
    },
    {
      id: 'Zadnor Saunion Anti-Personnel Missile',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Saunion', id: '5DC2' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Saunion', id: '5DC2' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Saunion', id: '5DC2' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'サウニオン', id: '5DC2' }),
      netRegexCn: NetRegexes.startsUsing({ source: '桑尼恩', id: '5DC2' }),
      condition: Conditions.targetIsYou(),
      response: Responses.spread(),
    },
    {
      id: 'Zadnor Saunion Missile Salvo',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Saunion', id: '5DC3' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Saunion', id: '5DC3' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Saunion', id: '5DC3' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'サウニオン', id: '5DC3' }),
      netRegexCn: NetRegexes.startsUsing({ source: '桑尼恩', id: '5DC3' }),
      response: Responses.stackMarkerOn(),
    },
    {
      id: 'Zadnor Saunion Wildfire Winds',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Dawon The Younger', id: '5DCD', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Dawon Junior', id: '5DCD', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Dawon Junior', id: '5DCD', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ドゥンJr\\.', id: '5DCD', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '小达温', id: '5DCD', capture: false }),
      delaySeconds: 10,
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          // TODO: during spiral scourge could be "get under middle/outer light orb"?
          en: 'Get Under Light Orb',
          de: 'Unter einem Lichtorb stellen',
          fr: 'Allez sous un Orbe lumineux',
          ja: '白玉へ',
          cn: '靠近白球',
          ko: '하얀 구슬 안으로',
        },
      },
    },
    {
      id: 'Zadnor Saunion Tooth and Talon',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Dawon The Younger', id: '5DD4' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Dawon Junior', id: '5DD4' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Dawon Junior', id: '5DD4' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ドゥンJr\\.', id: '5DD4' }),
      netRegexCn: NetRegexes.startsUsing({ source: '小达温', id: '5DD4' }),
      condition: tankBusterOnParty(),
      response: Responses.tankBuster(),
    },
    {
      id: 'Zadnor Saunion Swooping Frenzy',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Dawon The Younger', id: '5DD0', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Dawon Junior', id: '5DD0', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Dawon Junior', id: '5DD0', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ドゥンJr\\.', id: '5DD0', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '小达温', id: '5DD0', capture: false }),
      infoText: (data, _matches, output) => {
        // Every other Swooping Frenzy is followed by a Frigid Pulse, starting with the first.
        data.saunionSwoopingCount = (data.saunionSwoopingCount ?? 0) + 1;
        if (data.saunionSwoopingCount % 2)
          return output.text!();
      },
      outputStrings: {
        text: {
          en: 'Follow Dawon',
          de: 'Folge Dawon',
          cn: '跟随小达温',
          ko: '다우언 따라가기',
        },
      },
    },
    {
      id: 'Zadnor Diablo Advanced Death Ray',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({ id: '00E6' }),
      condition: (data) => data.ce === 'dalriadaDiablo',
      // TODO: this is maybe worth promoting to responses?
      response: (data, matches, output) => {
        // cactbot-builtin-response
        output.responseOutputStrings = {
          tankLaserOnYou: {
            en: 'Tank Laser on YOU',
            de: 'Tank Laser auf DIR',
            fr: 'Tank laser sur VOUS',
            ja: '自分にタンクレーザー',
            cn: '坦克激光点名',
            ko: '탱 레이저 대상자',
          },
          avoidTankLaser: {
            en: 'Avoid Tank Laser',
            de: 'Weiche dem Tanklaser aus',
            cn: '躲避坦克激光',
            ko: '탱 레이저 피하기',
          },
        };

        if (data.me === matches.target)
          return { alarmText: output.tankLaserOnYou!() };
        return { infoText: output.avoidTankLaser!() };
      },
    },
    {
      id: 'Zadnor Diablo Aetheric Explosion',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'The Diablo Armament', id: '5CC6', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Diablo-Armament', id: '5CC6', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Batterie D\'Artillerie Diablo', id: '5CC6', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ディアブロ・アーマメント', id: '5CC6', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '迪亚布罗魔兵', id: '5CC6', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Diablo Ultimate Psuedoterror',
      type: 'StartsUsing',
      // This is triggered on Diabolic Gate with a delay, so it gives an extra +4 seconds.
      netRegex: NetRegexes.startsUsing({ source: 'The Diablo Armament', id: '5C9F', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Diablo-Armament', id: '5C9F', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Batterie D\'Artillerie Diablo', id: '5C9F', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ディアブロ・アーマメント', id: '5C9F', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '迪亚布罗魔兵', id: '5C9F', capture: false }),
      delaySeconds: 37,
      response: Responses.getUnder(),
    },
    {
      id: 'Zadnor Diablo Advanced Death IV',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'The Diablo Armament', id: '5CAF', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Diablo-Armament', id: '5CAF', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Batterie D\'Artillerie Diablo', id: '5CAF', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ディアブロ・アーマメント', id: '5CAF', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '迪亚布罗魔兵', id: '5CAF', capture: false }),
      // Circles appear at the end of the cast.
      delaySeconds: 4,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Avoid Growing Circles',
          de: 'Weiche den wachsenden Kreisen aus',
          cn: '躲避变大圈圈',
          ko: '커지는 장판 피하기',
        },
      },
    },
    {
      id: 'Zadnor Diablo Advanced Death IV Followup',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'The Diablo Armament', id: '5CAF', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Diablo-Armament', id: '5CAF', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Batterie D\'Artillerie Diablo', id: '5CAF', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ディアブロ・アーマメント', id: '5CAF', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '迪亚布罗魔兵', id: '5CAF', capture: false }),
      delaySeconds: 12,
      // TODO: or "Avoid Growing Circles (again lol)"?
      response: Responses.moveAway(),
    },
    {
      id: 'Zadnor Diablo Aetheric Boom Raidwide',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'The Diablo Armament', id: '5CB3', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Diablo-Armament', id: '5CB3', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Batterie D\'Artillerie Diablo', id: '5CB3', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ディアブロ・アーマメント', id: '5CB3', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '迪亚布罗魔兵', id: '5CB3', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'Zadnor Diablo Aetheric Boom Balloons',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'The Diablo Armament', id: '5CB3', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Diablo-Armament', id: '5CB3', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Batterie D\'Artillerie Diablo', id: '5CB3', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ディアブロ・アーマメント', id: '5CB3', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '迪亚布罗魔兵', id: '5CB3', capture: false }),
      // Don't warn people to preposition here, because they probably need
      // heals after the initial hit before popping these.
      delaySeconds: 5.5,
      alertText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Pop Balloons',
          de: 'Orbs nehmen',
          cn: '吃球',
          ko: '구체 부딪히기',
        },
      },
    },
    {
      id: 'Zadnor Diablo Deadly Dealing',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'The Diablo Armament', id: '5CC2' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Diablo-Armament', id: '5CC2' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Batterie D\'Artillerie Diablo', id: '5CC2' }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ディアブロ・アーマメント', id: '5CC2' }),
      netRegexCn: NetRegexes.startsUsing({ source: '迪亚布罗魔兵', id: '5CC2' }),
      // TODO: these feel really late with 5 seconds, should they call instantly at 7?
      delaySeconds: (_data, matches) => parseFloat(matches.castTime) - 5,
      alertText: (data, _matches, output) => {
        data.diabloDealingCount = (data.diabloDealingCount ?? 0) + 1;
        return data.diabloDealingCount % 2 ? output.knockbackBits!() : output.knockbackNox!();
      },
      outputStrings: {
        knockbackBits: {
          en: 'Knockback (away from bits)',
          de: 'Rückstoß (Weg von den Magiteks)',
          cn: '击退 (避开浮游炮)',
          ko: '넉백 (비트 피하기)',
        },
        knockbackNox: {
          en: 'Knockback (into empty corner)',
          de: 'Rückstoß (in die leere Ecke)',
          cn: '击退 (进入空角落)',
          ko: '안전지대로 넉백',
        },
      },
    },
    {
      id: 'Zadnor Diablo Void Systems Overload',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'The Diablo Armament', id: '5CB7', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Diablo-Armament', id: '5CB7', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Batterie D\'Artillerie Diablo', id: '5CB7', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: 'ディアブロ・アーマメント', id: '5CB7', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '迪亚布罗魔兵', id: '5CB7', capture: false }),
      response: Responses.bigAoe(),
    },
    {
      id: 'Zadnor Diablo Pillar Of Shamash Spread',
      type: 'HeadMarker',
      // 5CBC damage
      netRegex: NetRegexes.headMarker({ id: '0017' }),
      condition: (data) => data.ce === 'dalriadaDiablo',
      preRun: (data, matches) => {
        data.diabloPillar ??= [];
        data.diabloPillar.push(matches.target);
      },
      alertText: (data, matches, output) => {
        if (data.me === matches.target)
          return output.text!();
      },
      outputStrings: {
        text: {
          en: 'Laser on YOU',
          de: 'Laser auf DIR',
          cn: '激光点名',
          ko: '레이저 대상자',
        },
      },
    },
    {
      id: 'Zadnor Diablo Pillar Of Shamash Stack',
      type: 'HeadMarker',
      // 5CBE damage (no headmarker???)
      netRegex: NetRegexes.headMarker({ id: '0017', capture: false }),
      condition: (data) => data.ce === 'dalriadaDiablo',
      delaySeconds: 3,
      suppressSeconds: 5,
      infoText: (data, _matches, output) => {
        if (!data.diabloPillar || !data.diabloPillar.includes(data.me))
          return output.text!();
      },
      run: (data) => delete data.diabloPillar,
      outputStrings: {
        text: {
          en: 'Line Stack',
          de: 'In einer Linie sammeln',
          fr: 'Package en ligne',
          ja: '直線頭割り',
          cn: '直线分摊',
          ko: '직선 쉐어',
        },
      },
    },
    {
      id: 'Zadnor Diablo Acceleration Bomb Dodge',
      type: 'GainsEffect',
      netRegex: NetRegexes.gainsEffect({ effectId: 'A61' }),
      condition: Conditions.targetIsYou(),
      durationSeconds: (_data, matches) => parseFloat(matches.duration) - 4,
      infoText: (_data, matches, output) => {
        // Durations are 7 and 12.
        const duration = parseFloat(matches.duration);
        return duration > 10 ? output.dodgeFirst!() : output.dodgeSecond!();
      },
      outputStrings: {
        dodgeFirst: {
          en: '(Dodge -> Stop)',
          de: '(Ausweichen -> Stop)',
          cn: '(躲避 -> 停停停)',
          ko: '(피하기 -> 멈추기)',
        },
        dodgeSecond: {
          en: '(Stop -> Dodge)',
          de: '(Stop -> Ausweichen)',
          cn: '(停停停 -> 躲避)',
          ko: '(멈추기 -> 피하기)',
        },
      },
    },
    {
      id: 'Zadnor Diablo Acceleration Bomb Stop',
      type: 'GainsEffect',
      netRegex: NetRegexes.gainsEffect({ effectId: 'A61' }),
      condition: Conditions.targetIsYou(),
      // TODO: this could be better timed to be later for the dodge -> stop version and earlier
      // for the stop -> dodge.
      delaySeconds: (_data, matches) => parseFloat(matches.duration) - 3.5,
      response: Responses.stopEverything(),
    },
  ],
  timelineReplace: [
    {
      'locale': 'en',
      'replaceText': {
        'Left Brand/Right Brand': 'Left/Right Brand',
        'Time Eruption/Reverse Time Eruption': '(Reverse?) Time Eruption',
        'North Wind/South Wind': 'North/South Wind',
        'Magitek Halo/Magitek Crossray': 'Magitek Halo/Crossray',
        'Magitek Crossray/Magitek Halo': 'Magitek Crossray/Halo',
        'Mobile Halo/Mobile Crossray': 'Mobile Halo/Crossray',
        'Mobile Crossray/Mobile Halo': 'Mobile Crossray/Halo',
      },
    },
    {
      'locale': 'de',
      'replaceSync': {
        '4Th Legion Augur': 'Augur der IV\\. Legion',
        '4Th Legion Blackburn': 'Schwarzbrand der IV\\. Legion',
        '4th-Make Belias': 'Belias der IV\\. Legion',
        '4Th-Make Cuchulainn': 'Cuchulainn der IV\\. Legion',
        '4th-Make Hashmal': 'Hashmallim der IV\\. Legion',
        '4th-Make Shemhazai': 'Shemhazai der IV\\. Legion',
        '7 minutes have elapsed since your last activity.': 'Seit deiner letzten Aktivität sind 7 Minuten vergangen.',
        '(?<!4Th Legion )Blackburn': 'Schwarzbrand',
        'Dawon The Younger': 'Dawon junior',
        'Diabolic Bit': 'Diablo-Drohne',
        'Dyunbu the Accursed': 'Dyunbu (?:der|die|das) Unlauter(?:e|er|es|en)',
        'Flameborne Zirnitra': 'Flammen-Zirnitra',
        'Huma': 'Homa',
        'Ice Sprite': 'Eis-Exergon',
        'Ignis Est': 'Ignis Est',
        'Magitek Development': 'Bereich Magitek-Forschung',
        'Phantom Hashmal': 'Hashmallims Abbild',
        'Sartauvoir The Inferno': 'Sartauvoir Eisenfeuer',
        'Saunion': 'Saunion',
        'Stormborne Zirnitra': 'Sturm-Zirnitra',
        'Tamed Alkonost(?!\'s Shadow)': 'gebändigt(?:e|er|es|en) Alkonost',
        'Tamed Alkonost\'s Shadow': 'gebändigt(?:e|er|es|en) Alkonost',
        'Tamed Carrion Crow': 'gebändigt(?:e|er|es|en) Aaskrähe',
        'The Diablo Armament': 'Diablo-Armament',
        'The fallen ring': 'Eingestürzte Grube',
        'The flagship landing': 'Kriegsschiff-Ankerplatz',
        'The greater hold': 'Großer Stauraum',
        'The loading dock': 'Ladebereich',
        'Vermilion Flame': 'feurig(?:e|er|es|en) Glut',
        'Vortical Orb': 'Magiewindkugel',
        'Waveborne Zirnitra': 'Wellen-Zirnitra',
      },
      'replaceText': {
        '--lasers--': '--Laser--',
        '--line stack--': '--In Linie sammeln--',
        '74 Degrees': 'Wassergeschoss',
        'Advanced Death IV': 'Super-Todka',
        'Advanced Death Ray': 'Super-Todesstrahl',
        'Advanced Nox': 'Super-Nox',
        'Aetheric Boom': 'Ätherknall',
        'Aetheric Explosion': 'Ätherische Explosion',
        'Aetherochemical Laser': 'Ätherochemischer Laser',
        'Ambient Pulsation': 'Ätherwulst',
        'Analysis': 'Analyse',
        'Anti-Personnel Missile': 'Antipersonenrakete',
        'Assault Cannon': 'Sturmkanone',
        'Ballistic Impact': 'Ballistischer Einschlag',
        'Broadside Barrage': 'Längssalve',
        'Burgeoning Dread': 'Welle der Angst',
        'Burn(?!ing)': 'Verbrennung',
        'Burning Blade': 'Brandklinge',
        'Deadly Dealing': 'Todeswatsche',
        'Diabolic Gate': 'Diabolisches Tor',
        'Double Cast': 'Doppelzauber',
        'Explosion': 'Explosion',
        'Fell Flow': 'Strom der Verdorbenheit',
        'Fire Brand': 'Majestätisches Kreuz',
        'Flamedive': 'Flammentaucher',
        'Flaming Cyclone': 'Flammenzyklon',
        'Fleshy Necromass': 'Todespresse',
        'Foreshadowing': 'Vorahnung',
        'Frigid Pulse': 'Froststoß',
        'Ghastly Aura': 'Verlustwelle',
        'Grand Crossflame': 'Große Kreuzflamme',
        'High-Powered Magitek Ray': 'Hochenergetischer Magitek-Laser',
        'Hyperpyroplexy': 'Hyper-Pyroplexie',
        'Ignis Est': 'Ignis Est',
        'Immolate': 'Opferung',
        'Left Brand': 'Feuerzeichen links',
        'Light Pseudopillar': 'Lichtsäule der Ätherochemie',
        'Magitek Bit': 'Magitek-Bit',
        'Magitek Crossray': 'Magitek-Kreuzlaser',
        'Magitek Halo': 'Magitek-Brennkreis',
        'Mannatheihwon Flame': 'Mannatheihwo-Flamme',
        'Might Of Malice': 'Trampelausbruch',
        'Missile Command': 'Raketenkommando',
        'Missile Salvo': 'Mehrfach-Rakete',
        'Mobile Crossray': 'Transfer-Kreuzlaser',
        'Mobile Halo': 'Transfer-Brennkreis',
        'Necrotic Billow': 'Fäulnisbrand',
        'Nihility\'s Song': 'Nihilismuslied',
        'North Wind': 'Nordwind',
        'Obey': 'Gehorchen',
        '(?<!Verd)Orb': 'Kugel',
        'Pain Storm': 'Schmerzsturm',
        'Painful Gust': 'Schmerzhafte Böe',
        'Pentagust': 'Pentagast',
        'Phenex': 'Phenex',
        'Pillar Of Shamash': 'Shams Säule',
        'Putrified Soul': 'Unreine Welle',
        'Pyrocrisis': 'Pyrokrise',
        'Pyrodoxy': 'Pyrodoxie',
        'Pyrokinesis': 'Pyrokinese',
        '(?<![-r])Pyroplexy': 'Pyroplexie',
        'Raw Heat': 'Flammende Welle',
        'Read Orders: Field Support': 'Befehl: Infanterieverstärkung',
        'Reverse Time Eruption': 'Umgekehrte Zeiteruption',
        'Right Brand': 'Feuerzeichen rechts',
        'Ruinous Pseudomen': 'Ruinöses Omen der Ätherochemie',
        'Sanctified Quake III': 'Gesegnetes Seisga',
        'South Wind': 'Südwind',
        'Spiral Scourge': 'Spiralspießer',
        'Stormborne Zirnitra': 'Flammen-Zirnitra',
        'Stormcall': 'Sturmruf',
        'Suppressive Magitek Rays': 'Omnidirektionaler Magitek-Laser',
        'Surface Missile': 'Raketenschlag',
        'Swooping Frenzy': 'Heftiges Schütteln',
        'Terminus Est': 'Terminus Est',
        'Thermal Gust': 'Thermalböe',
        '(?<!Reverse )Time Eruption': 'Zeiteruption',
        'Tooth And Talon': 'Krallen des Bestienkönigs',
        'Touchdown': 'Himmelssturz',
        'Turbine': 'Turbine',
        'Ultimate Pseudoterror': 'Ultimativer Terror der Ätherochemie',
        'Void Call': 'Helferlein',
        'Void Systems Overload': 'Modell-V-Amokfahrt',
        'Wildfire Winds': 'Majestätischer Windstoß',
      },
    },
    {
      'locale': 'fr',
      'missingTranslations': true,
      'replaceSync': {
        '4Th Legion Augur': 'augure de la 4e légion',
        '4Th Legion Blackburn': 'Escarre de la 4e légion',
        '4th-Make Belias': 'Bélias de la 4e légion',
        '4Th-Make Cuchulainn': 'cúchulainn de la 4e légion',
        '4th-Make Hashmal': 'Hashmal de la 4e légion',
        '4th-Make Shemhazai': 'Shemhazai de la 4e légion',
        '(?<!4Th Legion )Blackburn': 'Escarre',
        'Dawon The Younger': 'Dawon junior',
        'Diabolic Bit': 'drone de Diablo',
        'Dyunbu the Accursed': 'Dyunbu l\'impure',
        'Flameborne Zirnitra': 'zirnitra des flammes',
        'Huma': 'homa',
        'Ice Sprite': 'élémentaire de glace',
        'Ignis Est': 'Ignis Est',
        'Magitek Development': 'Section des recherches magitek',
        'Phantom Hashmal': 'double du Hashmal',
        'Sartauvoir The Inferno': 'Sartauvoir le fer rouge',
        'Saunion': 'Saunion',
        'Stormborne Zirnitra': 'zirnitra des tempêtes',
        'Tamed Alkonost(?!\'s Shadow)': 'alkonost dressé',
        'Tamed Alkonost\'s Shadow': 'ombre d\'Alkonost dressé',
        'Tamed Carrion Crow': 'corneille noire dressée',
        'The Diablo Armament': 'batterie d\'artillerie Diablo',
        'The fallen ring': 'Anneau effondré',
        'The flagship landing': 'Embarcadère du Dalriada',
        'The greater hold': 'Grande soute',
        'The loading dock': 'Aire de chargement',
        'Vermilion Flame': 'incandescence',
        'Vortical Orb': 'globe de vent maléfique',
        'Waveborne Zirnitra': 'zirnitra des torrents',
      },
      'replaceText': {
        '74 Degrees': 'Aqua-tir',
        'Advanced Death IV': 'Giga Mort renforcée',
        'Advanced Death Ray': 'Rayon de la mort renforcé',
        'Advanced Nox': 'Nox renforcée',
        'Aetheric Boom': 'Onde d\'éther',
        'Aetheric Explosion': 'Éther explosif',
        'Aetherochemical Laser': 'Laser magismologique',
        'Ambient Pulsation': 'Pulsation démoniaque',
        'Analysis': 'Analyse',
        'Anti-Personnel Missile': 'Pluie de missiles antipersonnel',
        'Assault Cannon': 'Canon d\'assaut',
        'Ballistic Impact': 'Impact de missile',
        'Broadside Barrage': 'Bourrasque latérale',
        'Burgeoning Dread': 'Vague de terreur',
        'Burn(?!ing)': 'Combustion',
        'Burning Blade': 'Lame calcinante',
        'Deadly Dealing': 'Fracas mortel',
        'Diabolic Gate': 'Porte d\'outre-monde',
        'Double Cast': 'Double incantation',
        'Explosion': 'Explosion',
        'Fell Flow': 'Torrent fangeux',
        'Fire Brand': 'Croix auguste',
        'Flamedive': 'Plongeon embrasé',
        'Flaming Cyclone': 'Cyclone de feu',
        'Fleshy Necromass': 'Écrasement malsain',
        'Foreshadowing': 'Préfiguration',
        'Frigid Pulse': 'Pulsation glaciale',
        'Ghastly Aura': 'Onde d\'amnésie',
        'Grand Crossflame': 'Croix suprême enflammée',
        'High-Powered Magitek Ray': 'Rayon magitek surpuissant',
        'Hyperpyroplexy': 'Hyperpyroplexie',
        'Ignis Est': 'Ignis Est',
        'Immolate': 'Immolation',
        'Left Brand': 'Marque au fer rouge gauche',
        'Light Pseudopillar': 'Colonne lumineuse magismologique',
        'Magitek Bit': 'Éjection de drones',
        'Magitek Crossray': 'Rayon croisé magitek',
        'Magitek Halo': 'Cercle enflammé magitek',
        'Mannatheihwon Flame': 'Flamme de Mannatheihwo',
        'Might Of Malice': 'Coup de pied puissant',
        'Missile Command': 'Commande missile',
        'Missile Salvo': 'Salve de missiles',
        'Mobile Crossray': 'Rayon croisé mobile',
        'Mobile Halo': 'Cercle enflammé mobile',
        'Necrotic Billow': 'Immolation putréfiante',
        'Nihility\'s Song': 'Chant de la vacuité',
        'North Wind': 'Vent de nord',
        'Obey': 'À l\'écoute du maître',
        'Pain Storm': 'Tempête de douleur',
        'Painful Gust': 'Rafale suppliciante',
        'Pentagust': 'Pentasouffle',
        'Phenex': 'Phenex',
        'Pillar Of Shamash': 'Pilier de Shams',
        'Putrified Soul': 'Vague de souillure',
        'Pyrocrisis': 'Pyrocrisie',
        'Pyrodoxy': 'Pyrodoxie',
        'Pyrokinesis': 'Pyrokinésie',
        '(?<!r)Pyroplexy': 'Pyroplexie',
        'Raw Heat': 'Vague explosive',
        'Read Orders: Field Support': 'Ordre tactique : Infanterie de soutien',
        'Reverse Time Eruption': 'Éruption à devancement',
        'Right Brand': 'Marque au fer rouge droit',
        'Ruinous Pseudomen': 'Mauvais présage magismologique',
        'Sanctified Quake III': 'Méga Séisme sanctifié',
        'South Wind': 'Vent de sud',
        'Spiral Scourge': 'Spirale empalante',
        'Stormborne Zirnitra': 'zirnitra des flammes',
        'Stormcall': 'Appel des tempêtes',
        'Suppressive Magitek Rays': 'Rayon magitek tous azimuts',
        'Surface Missile': 'Missiles sol-sol',
        'Swooping Frenzy': 'Plongeon frénétique',
        'Terminus Est': 'Terminus Est',
        'Thermal Gust': 'Bourrasque incandescente',
        '(?<!Reverse )Time Eruption': 'Éruption à retardement',
        'Tooth And Talon': 'Lacération du Roi bestial',
        'Touchdown': 'Atterrissage',
        'Turbine': 'Turbine',
        'Ultimate Pseudoterror': 'Terreur ultime magismologique',
        'Void Call': 'Invocation',
        'Void Systems Overload': 'Surrégime du moteur \'V\'',
        'Wildfire Winds': 'Tempête de plumes auguste',
      },
    },
    {
      'locale': 'ja',
      'missingTranslations': true,
      'replaceSync': {
        '4Th Legion Augur': 'IVレギオン・アウグル',
        '4Th Legion Blackburn': 'IVレギオン・ブラックバーン',
        '4th-Make Belias': 'IVレギオン・ベリアス',
        '4Th-Make Cuchulainn': 'IVレギオン・キュクレイン',
        '4th-Make Hashmal': 'IVレギオン・ハシュマリム',
        '4th-Make Shemhazai': 'IVレギオン・シュミハザ',
        '(?<!4Th Legion )Blackburn': 'ブラックバーン',
        'Dawon The Younger': 'ドゥンJr.',
        'Diabolic Bit': 'ディアブロ・ビット',
        'Dyunbu the Accursed': '不浄のユンブ',
        'Flameborne Zirnitra': 'フレイム・ジルニトラ',
        'Huma': 'フマ',
        'Ice Sprite': 'アイススプライト',
        'Ignis Est': 'イグニス・エスト',
        'Magitek Development': '魔導研究区画',
        'Phantom Hashmal': 'ハシュマリムの幻影',
        'Sartauvoir The Inferno': '鉄火のサルトヴォアール',
        'Saunion': 'サウニオン',
        'Stormborne Zirnitra': 'ストーム・ジルニトラ',
        'Tamed Alkonost(?!\'s Shadow)': 'テイムド・アルコノスト',
        'Tamed Alkonost\'s Shadow': 'テイムド・アルコノストの影',
        'Tamed Carrion Crow': 'テイムド・キャリオンクロウ',
        'The Diablo Armament': 'ディアブロ・アーマメント',
        'The fallen ring': '崩落した試掘坑',
        'The flagship landing': '旗艦停泊地',
        'The greater hold': '大型格納区画',
        'The loading dock': '搬入出区画',
        'Vermilion Flame': '赤熱火',
        'Vortical Orb': '魔嵐球',
        'Waveborne Zirnitra': 'ウェイブ・ジルニトラ',
      },
      'replaceText': {
        '74 Degrees': 'ウォーターショット',
        'Advanced Death IV': '強化デスジャ',
        'Advanced Death Ray': '強化デスレイ',
        'Advanced Nox': '強化ノックス',
        'Aetheric Boom': 'エーテル波動',
        'Aetheric Explosion': 'エーテリックエクスプロージョン',
        'Aetherochemical Laser': '魔科学レーザー',
        'Ambient Pulsation': '魔脈瘤',
        'Analysis': 'アナライズ',
        'Anti-Personnel Missile': '対人ミサイル乱射',
        'Assault Cannon': 'アサルトカノン',
        'Ballistic Impact': 'ミサイル着弾',
        'Broadside Barrage': 'ボロードサイドバラージ',
        'Burgeoning Dread': '恐怖の波動',
        'Burn(?!ing)': '燃焼',
        'Burning Blade': 'バーンブレイド',
        'Deadly Dealing': 'デッドリースマッシュ',
        'Diabolic Gate': '異界の扉',
        'Double Cast': 'ダブルキャスト',
        '(?<!Aetheric )Explosion': '爆発',
        'Fell Flow': '汚濁の奔流',
        'Fire Brand': '炎帝十文字',
        'Flamedive': 'フレイムダイブ',
        'Flaming Cyclone': 'フレイムサイクロン',
        'Fleshy Necromass': '不浄圧殺',
        'Foreshadowing': 'フォアシャドウィング',
        'Frigid Pulse': 'フリジッドパルス',
        'Ghastly Aura': '喪失の波動',
        'Grand Crossflame': 'グランドクロスフレイム',
        'High-Powered Magitek Ray': '高出力魔導レーザー',
        'Hyperpyroplexy': 'ハイパー・パイロプレクシー',
        'Ignis Est': 'イグニス・エスト',
        'Immolate': '大燃焼',
        'Left Brand': 'レフトブランド',
        'Light Pseudopillar': '魔科学式リヒト・ゾイレ',
        'Magitek Bit': 'ビット射出',
        'Magitek Crossray': '魔導クロスレーザー',
        'Magitek Halo': '魔導バーニングサークル',
        'Mannatheihwon Flame': 'マントヴァフレイム',
        'Might Of Malice': '重蹴撃',
        'Missile Command': 'ミサイル全弾発射',
        'Missile Salvo': '連装ミサイル',
        'Mobile Crossray': '転移式クロスレーザー',
        'Mobile Halo': '転移式バーニングサークル',
        'Necrotic Billow': '腐朽焼殺',
        'Nihility\'s Song': 'ニヒリティソング',
        'North Wind': '北風',
        'Obey': 'しじをきく',
        'Pain Storm': 'ペインストーム',
        'Painful Gust': 'ペインフルガスト',
        'Pentagust': 'ペンタガスト',
        'Phenex': 'フェネクス',
        'Pillar Of Shamash': 'シャムスの柱',
        'Putrified Soul': '汚染波',
        'Pyrocrisis': 'パイロクライシス',
        'Pyrodoxy': 'パイロドクシー',
        'Pyrokinesis': 'パイロキネシス',
        '(?<![-r])Pyroplexy': 'パイロプレクシー',
        'Raw Heat': '爆炎波',
        'Read Orders: Field Support': '作戦指示：歩兵支援',
        'Reverse Time Eruption': 'リバース・タイムエラプション',
        'Right Brand': 'ライトブランド',
        'Ruinous Pseudomen': '魔科学式ルイナスオーメン',
        'Sanctified Quake III': 'サンクティファイド・クエイガ',
        'South Wind': '南風',
        'Spiral Scourge': 'スパイラルスカージ',
        'Stormborne Zirnitra': 'フレイム・ジルニトラ',
        'Stormcall': 'ストームコール',
        'Suppressive Magitek Rays': '全方位魔導レーザー',
        'Surface Missile': '対地ミサイル',
        'Swooping Frenzy': 'スワープフレンジー',
        'Terminus Est': 'ターミナス・エスト',
        'Thermal Gust': 'サーマルガスト',
        '(?<!Reverse )Time Eruption': 'タイムエラプション',
        'Tooth And Talon': '獣王裂爪撃',
        'Touchdown': 'タッチダウン',
        'Turbine': 'タービン',
        'Ultimate Pseudoterror': '魔科学式アルティメットテラー',
        'Void Call': '使い魔召喚',
        'Void Systems Overload': 'V機関暴走',
        'Wildfire Winds': '炎帝嵐翼破',
      },
    },
    {
      'locale': 'cn',
      'replaceSync': {
        '4Th Legion Augur': '第四军团先知',
        '4Th Legion Blackburn': '第四军团黑色燃焰',
        '4th-Make Belias': '第四军团贝利亚斯',
        '4Th-Make Cuchulainn': '第四军团丘库雷因',
        '4th-Make Hashmal': '第四军团哈修马利姆',
        '4th-Make Shemhazai': '第四军团谢米哈扎',
        '7 minutes have elapsed since your last activity.': '已经7分钟没有进行任何操作',
        '(?<!Tamed )Alkonost': '阿尔科诺斯特',
        'Ayida': '阿依达',
        '(?<!4Th Legion )Blackburn': '黑色燃焰',
        'Clibanarius': '铠甲重骑兵',
        'Dawon The Younger': '小达温',
        'Diabolic Bit': '迪亚布罗浮游炮',
        'Dyunbu the Accursed': '污身秽心 尤恩布',
        'Flameborne Zirnitra': '火焰札尼尔查妖蛇',
        'Hanbi': '汉比',
        'Hedetet': '赫德提特',
        'Hrodvitnir': '恶名苍狼',
        'Huma': '呼玛',
        'Ice Sprite': '冰元精',
        'Ignis Est': '是为烈火',
        'Kampe': '坎珀',
        'Magitek Development': '魔导研究区',
        'Phantom Hashmal': '哈修马利姆的幻影',
        'Sartauvoir The Inferno': '铁胆狱火 萨托瓦尔',
        'Saunion': '桑尼恩',
        'Stormborne Zirnitra': '暴风札尼尔查妖蛇',
        'Tamed Alkonost(?!\'s Shadow)': '驯服阿尔科诺斯特',
        'Tamed Alkonost\'s Shadow': '驯服阿尔科诺斯特之影',
        'Tamed Carrion Crow': '驯服食腐鸦',
        'The Diablo Armament': '迪亚布罗魔兵',
        'The fallen ring': '崩塌的试掘坑',
        'The flagship landing': '旗舰停泊地',
        'The greater hold': '大型兵器仓库',
        'The loading dock': '货物装卸区',
        'Vermilion Flame': '赤热火',
        'Vortical Orb': '魔风球',
        'Waveborne Zirnitra': '波涛札尼尔查妖蛇',
      },
      'replaceText': {
        '--lasers--': '--激光--',
        '--line stack--': '--直线分摊--',
        '74 Degrees': '射水',
        'Advanced Death IV': '强化极死',
        'Advanced Death Ray': '强化死亡射线',
        'Advanced Nox': '深夜',
        'Aetheric Boom': '以太波动',
        'Aetheric Explosion': '以太爆炸',
        'Aetherochemical Laser': '魔科学激光',
        'Ambient Pulsation': '魔脉瘤',
        'Analysis': '分析',
        'Anti-Personnel Missile': '对人导弹乱射',
        'Assault Cannon': '突击加农炮',
        'Ballistic Impact': '导弹命中',
        'Broadside Barrage': '侧翼火力',
        'Burgeoning Dread': '恐惧波动',
        'Burn(?!ing)': '燃烧',
        'Burning Blade': '燃烧之刃',
        'Deadly Dealing': '致命碎击',
        'Diabolic Gate': '异界之门',
        'Double Cast': '双重咏唱',
        '(?<!Aetheric )Explosion': '爆炸',
        'Fell Flow': '污浊奔流',
        'Fire Brand': '炎帝十文字',
        'Flamedive': '烈焰俯冲',
        'Flaming Cyclone': '烈焰旋风',
        'Fleshy Necromass': '不净压杀',
        'Foreshadowing': '预示',
        'Frigid Pulse': '寒冷脉冲',
        'Ghastly Aura': '丧失波动',
        'Grand Crossflame': '大十字火',
        'High-Powered Magitek Ray': '高功率魔导激光',
        'Hyperpyroplexy': '超火卒',
        'Ignis Est': '是为烈火',
        'Immolate': '大燃烧',
        'Left Brand': '左印',
        'Light Pseudopillar': '魔科学式光柱',
        'Magitek Bit': '浮游炮射出',
        'Magitek Crossray': '魔导交叉激光',
        'Magitek Halo': '魔导焰光环',
        'Mannatheihwon Flame': '曼托瓦之炎',
        'Might Of Malice': '重踢击',
        'Missile Command': '导弹齐发',
        'Missile Salvo': '连装导弹',
        'Mobile Crossray': '移动式交叉激光',
        'Mobile Halo': '移动式焰光环',
        'Necrotic Billow': '腐朽烧杀',
        'Nihility\'s Song': '虚无之歌',
        'North Wind': '北风',
        'Obey': '服从',
        '(?<!Verd)Orb': '球',
        'Pain Storm': '痛苦风暴',
        'Painful Gust': '极痛突风',
        'Pentagust': '五向突风',
        'Phenex': '菲尼克斯',
        'Pillar Of Shamash': '太阳之柱',
        'Putrified Soul': '污染波',
        'Pyrocrisis': '火危',
        'Pyrodoxy': '火念',
        'Pyrokinesis': '火动',
        '(?<![-r])Pyroplexy': '火卒',
        'Raw Heat': '爆炎破',
        'Read Orders: Field Support': '作战指示：步兵支援',
        'Reverse Time Eruption': '时空地火喷发·逆转',
        'Right Brand': '右印',
        'Ruinous Pseudomen': '魔科学式破灭预兆',
        'Sanctified Quake III': '圣化爆震',
        'South Wind': '南风',
        'Spiral Scourge': '螺旋灾变',
        'Stormborne Zirnitra': '火焰札尼尔查妖蛇',
        'Stormcall': '呼唤风暴',
        'Suppressive Magitek Rays': '全方位魔导激光',
        'Surface Missile': '对地导弹',
        'Swooping Frenzy': '狂乱猛冲',
        'Terminus Est': '恩惠终结',
        'Thermal Gust': '炙热风',
        '(?<!Reverse )Time Eruption': '时空地火喷发',
        'Tooth And Talon': '兽王裂爪击',
        'Touchdown': '空降',
        'Turbine': '涡轮',
        'Ultimate Pseudoterror': '魔科学式究极恐惧',
        'Void Call': '虚无召唤',
        'Void Systems Overload': '虚无系统失控',
        'Wildfire Winds': '炎帝风翼破',
      },
    },
  ],
};

export default triggerSet;
