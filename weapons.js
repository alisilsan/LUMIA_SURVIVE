// 공용 스킬(무기)과 능력치 강화 데이터

const WEAPON_DEFS = {
    missile: {
      name: '리펄서 미사일',
      desc: '가장 가까운 적을 추적합니다.',
      color: '#ffb86b',
      levels: [
        { count: 1, damage: 15, cooldown: 1600, speed: 340, splash: 40 },
        { count: 1, damage: 18, cooldown: 1450, speed: 350, splash: 44 },
        { count: 2, damage: 20, cooldown: 1350, speed: 360, splash: 48 },
        { count: 2, damage: 25, cooldown: 1250, speed: 370, splash: 52 },
        { count: 3, damage: 30, cooldown: 1150, speed: 380, splash: 56 },
      ],
    },
    protocol: {
      name: '프로토콜 위반',
      desc: '드론을 소환해 범위 내 적에게 피해를 줍니다.',
      color: '#c9d6e3',
      levels: [
        { damage: 20, cooldown: 10000, radius: 90 },
        { damage: 26, cooldown: 9000, radius: 90 },
        { damage: 32, cooldown: 8000, radius: 95 },
        { damage: 40, cooldown: 7000, radius: 95 },
        { damage: 50, cooldown: 6000, radius: 100 },
      ],
    },
    truthblade: {
      name: '진실의 칼날',
      desc: '플레이어 주위의 적에게 피해를 입힙니다.',
      color: '#ffe8a3',
      levels: [
        { damage: 18, cooldown: 10000, radius: 200 },
        { damage: 23, cooldown: 9000, radius: 200 },
        { damage: 29, cooldown: 8000, radius: 200 },
        { damage: 36, cooldown: 7000, radius: 200 },
        { damage: 44, cooldown: 6000, radius: 200 },
      ],
    },
    meteor: {
      name: '메테오',
      desc: '지정 위치에 운석을 떨어뜨려 적에게 피해를 줍니다.',
      color: '#ff6b35',
      levels: [
        { damage: 30, cooldown: 15000, radius: 100 },
        { damage: 38, cooldown: 13000, radius: 105 },
        { damage: 47, cooldown: 12000, radius: 110 },
        { damage: 58, cooldown: 11000, radius: 115 },
        { damage: 70, cooldown: 10000, radius: 120 },
      ],
    },
    weaken: {
      name: '쇠약',
      desc: '범위 내 적의 이동속도를 감소시키는 장판을 설치합니다.',
      color: '#8a9ba8',
      levels: [
        { cooldown: 10000, radius: 130, duration: 3.0 },
        { cooldown: 9000, radius: 130, duration: 3.5 },
        { cooldown: 8000, radius: 130, duration: 4.0 },
        { cooldown: 7000, radius: 130, duration: 4.5 },
        { cooldown: 6000, radius: 130, duration: 5.0 },
      ],
    },
  };

const STAT_DEFS = {
    speed: {
      title: '헤르메스의 부츠',
      desc: '이동 속도 +10%',
      apply(p) { p.speedMult *= 1.1; },
    },
    hp: {
      title: '바니햇',
      desc: '최대 체력 +20 (즉시 회복)',
      apply(p) { p.maxHp += 20; p.hp += 20; },
    },
    cdr: {
      title: '델루리안 타임피스',
      desc: '공용 스킬 + 캐릭터 고유 스킬 쿨타임 감소 +10%',
      apply(p) { p.cooldownMult *= 0.9; },
    },
    magnet: {
      title: '오토 암즈',
      desc: '아이템 획득 범위 +30',
      apply(p) { p.magnetRadius += 30; },
    },
    guardianSuit: {
      title: '가디언 슈트',
      desc: '초당 최대체력 비율만큼 체력 회복 (1%→1.5%→2%→2.5%→3%)',
      apply(p) {
        const tiers = [0.01, 0.015, 0.02, 0.025, 0.03];
        p.regenPercent = tiers[p.statPicks.guardianSuit - 1];
      },
    },
    burgundy47: {
      title: '버건디 47',
      desc: '모든 피해에 흡혈 적용 (0.5%→0.7%→0.8%→0.9%→1%)',
      apply(p) {
        const tiers = [0.005, 0.007, 0.008, 0.009, 0.01];
        p.lifestealPct = tiers[p.statPicks.burgundy47 - 1];
      },
    },
    fateDice: {
      title: '운명의 주사위',
      desc: '레벨업 카드 새로고침 가능 횟수 +1',
      apply(p) { p.rerollsLeft = (p.rerollsLeft || 0) + 1; },
    },
    lightEmblem: {
      title: '빛의 증표',
      desc: '모든 스킬·평타의 고정 추가 피해 (+5→+8→+10→+12→+15)',
      apply(p) { p.statFlatDamage = [5, 8, 10, 12, 15][p.statPicks.lightEmblem - 1]; },
    },
  };
