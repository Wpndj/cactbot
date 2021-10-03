import Conditions from '../../../../../resources/conditions';
import NetRegexes from '../../../../../resources/netregexes';
import { Responses } from '../../../../../resources/responses';
import ZoneId from '../../../../../resources/zone_id';
import { RaidbossData } from '../../../../../types/data';
import { TriggerSet } from '../../../../../types/trigger';

export type Data = RaidbossData;

// O5N - Sigmascape 1.0 Normal
const triggerSet: TriggerSet<Data> = {
  zoneId: ZoneId.SigmascapeV10,
  timelineFile: 'o5n.txt',
  resetWhenOutOfCombat: false,
  triggers: [
    {
      id: 'O5N Stop Combat',
      type: 'RemovedCombatant',
      netRegex: NetRegexes.removingCombatant({ name: 'Phantom Train', capture: false }),
      netRegexDe: NetRegexes.removingCombatant({ name: 'Phantomzug', capture: false }),
      netRegexFr: NetRegexes.removingCombatant({ name: 'Train Fantôme', capture: false }),
      netRegexJa: NetRegexes.removingCombatant({ name: '魔列車', capture: false }),
      netRegexCn: NetRegexes.removingCombatant({ name: '魔列车', capture: false }),
      netRegexKo: NetRegexes.removingCombatant({ name: '마열차', capture: false }),
      run: (data) => data.StopCombat(),
    },
    {
      id: 'O5N Acid Rain',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Phantom Train', id: '28BB', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Phantomzug', id: '28BB', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Train Fantôme', id: '28BB', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ source: '魔列車', id: '28BB', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ source: '魔列车', id: '28BB', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ source: '마열차', id: '28BB', capture: false }),
      response: Responses.aoe(),
    },
    {
      id: 'O5N Doom Strike',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ source: 'Phantom Train', id: '28A3' }),
      netRegexDe: NetRegexes.startsUsing({ source: 'Phantomzug', id: '28A3' }),
      netRegexFr: NetRegexes.startsUsing({ source: 'Train Fantôme', id: '28A3' }),
      netRegexJa: NetRegexes.startsUsing({ source: '魔列車', id: '28A3' }),
      netRegexCn: NetRegexes.startsUsing({ source: '魔列车', id: '28A3' }),
      netRegexKo: NetRegexes.startsUsing({ source: '마열차', id: '28A3' }),
      response: Responses.tankBuster(),
    },
    {
      id: 'O5N Head On',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '28A4', source: 'Phantom Train', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '28A4', source: 'Phantomzug', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '28A4', source: 'Train Fantôme', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '28A4', source: '魔列車', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ id: '28A4', source: '魔列车', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ id: '28A4', source: '마열차', capture: false }),
      response: Responses.getOut(),
    },
    {
      id: 'O5N Diabolic Headlamp',
      type: 'StartsUsing',
      netRegex: NetRegexes.startsUsing({ id: '28A6', source: 'Phantom Train', capture: false }),
      netRegexDe: NetRegexes.startsUsing({ id: '28A6', source: 'Phantomzug', capture: false }),
      netRegexFr: NetRegexes.startsUsing({ id: '28A6', source: 'Train Fantôme', capture: false }),
      netRegexJa: NetRegexes.startsUsing({ id: '28A6', source: '魔列車', capture: false }),
      netRegexCn: NetRegexes.startsUsing({ id: '28A6', source: '魔列车', capture: false }),
      netRegexKo: NetRegexes.startsUsing({ id: '28A6', source: '마열차', capture: false }),
      response: Responses.stackMiddle(),
    },
    {
      id: 'O5N Ghost Tether',
      type: 'Tether',
      netRegex: NetRegexes.tether({ id: '0001' }),
      condition: Conditions.targetIsYou(),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Bait ghost into light circle',
          cn: '诱导幽灵进光圈',
        },
      },
    },
    {
      id: 'O5N Diabolic Light',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({ id: '0001' }),
      condition: Conditions.targetIsYou(),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Drop Marker Away',
          de: 'Licht', // FIXME
          fr: 'Lumière', // FIXME
          ja: '魔界の光', // FIXME
          cn: '远离放置光点名',
          ko: '빛장판', // FIXME
        },
      },
    },
    {
      id: 'O5N Diabolic Wind',
      type: 'HeadMarker',
      netRegex: NetRegexes.headMarker({ id: '0046' }),
      condition: Conditions.targetIsYou(),
      response: Responses.spread(),
    },
    {
      id: 'O5N Throttle',
      type: 'GainsEffect',
      netRegex: NetRegexes.gainsEffect({ effectId: '3AA' }),
      condition: Conditions.targetIsYou(),
      infoText: (_data, _matches, output) => output.text!(),
      outputStrings: {
        text: {
          en: 'Touch ghost',
          cn: '撞幽灵',
        },
      },
    },
  ],
  timelineReplace: [
    {
      'locale': 'de',
      'replaceSync': {
        'Phantom Train': 'Phantomzug',
        'Wroth Ghost': 'erzürnt(?:e|er|es|en) Geist',
      },
      'replaceText': {
        'Acid Rain': 'Säureregen',
        'Add Wave': 'Add Welle',
        'Crossing Whistle': 'Kreuzend Pfeife',
        'Diabolic Chimney': 'Diabolischer Schlot',
        'Diabolic Headlamp': 'Diabolische Leuchte',
        'Diabolic Light': 'Diabolisches Licht',
        'Diabolic Wind': 'Diabolischer Wind',
        'Doom Strike': 'Vernichtungsschlag',
        'Encumber': 'Wegsperrung',
        'Ghost Beams': 'Geisterstrahlen',
        'Ghosts': 'Geister',
        'Head On': 'Frontalangriff',
        'Saintly Beam': 'Heiligenstrahl',
        'Tether Whistle': 'Verfolger Pfeife',
      },
    },
    {
      'locale': 'fr',
      'replaceSync': {
        'Phantom Train': 'train fantôme',
        'Wroth Ghost': 'fantôme furieux',
      },
      'replaceText': {
        'Acid Rain': 'Pluie acide',
        'Add Wave': 'Vague d\'Adds',
        'Crossing Whistle': 'Sifflet traversée',
        'Diabolic Chimney': 'Cheminée diabolique',
        'Diabolic Headlamp': 'Phare diabolique',
        'Diabolic Light': 'Lueur diabolique',
        'Diabolic Wind': 'Vent diabolique',
        'Doom Strike': 'Frappe létale',
        'Encumber': 'Encombrement',
        'Ghost Beams': 'Faisceaux Sacrés',
        'Ghosts': 'Fantômes',
        'Head On': 'Plein fouet',
        'Saintly Beam': 'Faisceaux sacrés',
        'Tether Whistle': 'Sifflet liens',
      },
    },
    {
      'locale': 'ja',
      'replaceSync': {
        'Phantom Train': '魔列車',
        'Wroth Ghost': 'ロスゴースト',
      },
      'replaceText': {
        'Acid Rain': '酸性雨',
        'Add Wave': '雑魚いっぱい',
        'Crossing Whistle': '魔界の汽笛: 通路ゴースト',
        'Diabolic Chimney': '魔界の噴煙',
        'Diabolic Headlamp': '魔界の前照灯',
        'Diabolic Light': '魔界の光',
        'Diabolic Wind': '魔界の風',
        'Doom Strike': '魔霊撃',
        'Encumber': '進路妨害',
        'Ghost Beams': 'ゴーストビーム',
        'Ghosts': 'ゴースト',
        'Head On': '追突',
        'Saintly Beam': 'セイントビーム',
        'Tether Whistle': '魔界の汽笛: 線繋ぐゴースト',
      },
    },
    {
      'locale': 'cn',
      'replaceSync': {
        'Phantom Train': '魔列车',
        'Wroth Ghost': '怒灵',
      },
      'replaceText': {
        'Acid Rain': '酸雨',
        'Add Wave': '一波小怪',
        'Crossing Whistle': '交叉汽笛',
        'Diabolic Chimney': '魔界喷烟',
        'Diabolic Headlamp': '魔界前照灯',
        'Diabolic Light': '魔界光',
        'Diabolic Wind': '魔界风',
        'Doom Strike': '魔灵击',
        'Encumber': '挡路',
        'Ghost Beams': '幽灵出现',
        'Ghosts': '幽灵',
        'Head On': '追尾',
        'Saintly Beam': '圣光射线',
        'Tether Whistle': '连线汽笛',
      },
    },
    {
      'locale': 'ko',
      'missingTranslations': true,
      'replaceSync': {
        'Phantom Train': '마열차',
        'Wroth Ghost': '격노하는 유령',
      },
      'replaceText': {
        'Acid Rain': '산성비',
        'Diabolic Chimney': '마계의 연기',
        'Diabolic Headlamp': '마계의 전조등',
        'Diabolic Light': '마계의 빛',
        'Diabolic Wind': '마계의 바람',
        'Doom Strike': '마령격',
        'Encumber': '진로 방해',
        'Head On': '추돌',
        'Saintly Beam': '성스러운 광선',
      },
    },
  ],
};

export default triggerSet;
