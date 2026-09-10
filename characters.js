// 캐릭터 정의(고유 스킬 포함) 및 플레이어 픽셀 스프라이트

const CHARACTERS = {
    aiden: {
      name: '에이든',
      tagline: '전격의 저격수',
      color: '#66d9ff',
      playable: true,
      skills: {
        s1: {
          name: '전자포',
          desc: '지정한 방향으로 탄환 1개를 발사해 적중한 적에게 피해를 입힙니다.',
          unlockLevel: 1,
          levels: [
            { damage: 15, pierce: 1, cooldown: 4, desc: '쿨다운 4.0초 · 피해 15 · 관통 1회' },
            { damage: 20, pierce: 1, cooldown: 3.5, desc: '쿨다운 3.5초 · 피해 20 · 관통 1회' },
            { damage: 25, pierce: 2, cooldown: 3, desc: '쿨다운 3.0초 · 피해 25 · 관통 2회' },
            { damage: 30, pierce: 2, cooldown: 2.5, desc: '쿨다운 2.5초 · 피해 30 · 관통 2회' },
            { damage: 35, pierce: 3, cooldown: 2, slow: true, desc: '쿨다운 2.0초 · 피해 35 · 적중 시 1초간 이동속도 30% 감소 · 관통 3회' },
          ],
        },
        s2: {
          name: '전하 소산',
          desc: '무기에 전류를 모아 주변 적 전체에게 피해를 입히고 이동속도를 감소시킵니다.',
          unlockLevel: 3,
          levels: [
            { damage: 20, cooldown: 15, radius: 200, desc: '반경 200 · 쿨다운 15초 · 피해 20 · 이동속도 30% 감소(0.5초)' },
            { damage: 26, cooldown: 13, radius: 200, desc: '반경 200 · 쿨다운 13초 · 피해 26 · 이동속도 30% 감소(0.5초)' },
            { damage: 32, cooldown: 10, radius: 200, desc: '반경 200 · 쿨다운 10초 · 피해 32 · 이동속도 30% 감소(0.5초)' },
            { damage: 38, cooldown: 8, radius: 200, desc: '반경 200 · 쿨다운 8초 · 피해 38 · 이동속도 30% 감소(0.5초)' },
            { damage: 45, cooldown: 8, radius: 200, root: true, desc: '반경 200 · 쿨다운 8초 · 피해 45 · 적중 시 1.5초간 속박' },
          ],
        },
        s3: {
          name: '낙뢰',
          desc: '플레이어 주변 랜덤 위치에 낙뢰를 떨어뜨려 범위 내 적에게 피해를 입힙니다.',
          unlockLevel: 5,
          levels: [
            { damage: 24, cooldown: 25, strikes: 1, desc: '쿨다운 25초 · 피해 24 · 낙뢰 1개' },
            { damage: 30, cooldown: 23, strikes: 1, desc: '쿨다운 23초 · 피해 30 · 낙뢰 1개' },
            { damage: 36, cooldown: 20, strikes: 2, desc: '쿨다운 20초 · 피해 36 · 낙뢰 2개' },
            { damage: 42, cooldown: 18, strikes: 2, desc: '쿨다운 18초 · 피해 42 · 낙뢰 2개' },
            { damage: 48, cooldown: 15, strikes: 3, desc: '쿨다운 15초 · 피해 48 · 낙뢰 3개로 증가' },
          ],
        },
      },
    },
    celine: {
      areaRadiusMult: 1.1,
      name: '셀린',
      tagline: '폭발물 전문가',
      color: '#ff9a3c',
      playable: true,
      skills: {
        s1: {
          name: '플라즈마 폭탄',
          desc: '폭탄을 투척해 적중 지점의 적에게 피해를 입힙니다.',
          unlockLevel: 1,
          levels: [
            { damage: 20, cooldown: 5, radius: 70, desc: '쿨다운 5.0초 · 피해 20' },
            { damage: 25, cooldown: 4.5, radius: 75, desc: '쿨다운 4.5초 · 피해 25' },
            { damage: 30, cooldown: 4, radius: 80, multiHit: 2, desc: '쿨다운 4.0초 · 피해 30 · 2회 연속 폭발' },
            { damage: 35, cooldown: 3.5, radius: 85, multiHit: 2, desc: '쿨다운 3.5초 · 피해 35 · 2회 연속 폭발' },
            { damage: 40, cooldown: 3, radius: 90, multiHit: 3, desc: '쿨다운 3.0초 · 피해 40 · 3회 연속 폭발' },
          ],
        },
        s2: {
          name: '블라스트 웨이브',
          desc: '반경 200 내 랜덤 적 위치에 충격파 폭탄을 던집니다. 적이 없으면 반경 200 내 랜덤 위치에 발동합니다.',
          unlockLevel: 3,
          levels: [
            { damage: 25, cooldown: 12, radius: 130, desc: '반경 130 · 쿨다운 12초 · 피해 18 · 적/자신 넉백' },
            { damage: 32, cooldown: 11, radius: 130, desc: '반경 130 · 쿨다운 11초 · 피해 23 · 적/자신 넉백' },
            { damage: 38, cooldown: 10, radius: 130, desc: '반경 130 · 쿨다운 10초 · 피해 29 · 적/자신 넉백' },
            { damage: 45, cooldown: 9, radius: 130, desc: '반경 130 · 쿨다운 9초 · 피해 36 · 적/자신 넉백' },
            { damage: 50, cooldown: 8, radius: 130, zone: true, desc: '반경 130 · 쿨다운 8초 · 피해 44 · 넉백 + 1초 장판(0.2초마다 최대체력 5%)' },
          ],
        },
        s3: {
          name: '자력 융합',
          desc: '플레이어 주변 랜덤 위치에 폭탄을 투척해 범위 내 적에게 피해를 입힙니다.',
          unlockLevel: 5,
          levels: [
            { damage: 20, cooldown: 20, radius: 110, desc: '반경 110 · 쿨다운 30초 · 피해 20' },
            { damage: 26, cooldown: 15, radius: 110, desc: '반경 110 · 쿨다운 25초 · 피해 26' },
            { damage: 32, cooldown: 13, radius: 110, desc: '반경 110 · 쿨다운 23초 · 피해 32' },
            { damage: 40, cooldown: 12, radius: 110, desc: '반경 110 · 쿨다운 22초 · 피해 40' },
            { damage: 50, cooldown: 10, radius: 110, zone: true, desc: '반경 110 · 쿨다운 20초 · 피해 50 · 3초 장판(0.5초마다 최대체력 5%)' },
          ],
        },
      },
    },
    jackie: {
      name: '재키',
      tagline: '피의 사냥꾼',
      color: '#ff2e5b',
      playable: true,
      skills: {
        s1: {
          name: '힘줄 절단',
          desc: '반경 200 내 가장 가까운 적 방향으로 휘두르고, 적이 없으면 랜덤 방향으로 휘두릅니다. 부채꼴 공격 범위 내 적에게 출혈을 부여합니다.',
          unlockLevel: 1,
          levels: [
            { damage: 18, cooldown: 4, coneDeg: 60, desc: '쿨다운 4.0초 · 피해 18 · 범위 60°' },
            { damage: 23, cooldown: 3.5, coneDeg: 70, desc: '쿨다운 3.5초 · 피해 23 · 범위 70°' },
            { damage: 29, cooldown: 3, coneDeg: 80, desc: '쿨다운 3.0초 · 피해 29 · 범위 80°' },
            { damage: 36, cooldown: 2.5, coneDeg: 90, desc: '쿨다운 2.5초 · 피해 36 · 범위 90°' },
            { damage: 44, cooldown: 2, coneDeg: 100, slow: true, desc: '쿨다운 2.0초 · 피해 44 · 범위 100° · 적중 시 3초간 이동속도 30% 감소' },
          ],
        },
        s2: {
          name: '피의 축제',
          desc: '[패시브] 몬스터 50마리 처치마다 5초간 피의 광기(이동속도 +20%, 흡혈)가 발동합니다.',
          unlockLevel: 3,
          passive: true,
          levels: [
            { lifesteal: 0.05, desc: '광기 상태 흡혈 5% (몬스터 50마리 처치마다 5초간 발동)' },
            { lifesteal: 0.06, desc: '광기 상태 흡혈 6% (몬스터 50마리 처치마다 5초간 발동)' },
            { lifesteal: 0.07, desc: '광기 상태 흡혈 7% (몬스터 50마리 처치마다 5초간 발동)' },
            { lifesteal: 0.08, desc: '광기 상태 흡혈 8% (몬스터 50마리 처치마다 5초간 발동)' },
            { lifesteal: 0.09, desc: '광기 상태 흡혈 9% (몬스터 50마리 처치마다 5초간 발동)' },
          ],
        },
        s3: {
          name: '습격자의 숨결',
          desc: '반경 300 내 적 위치에 3초간 피의 장판을 생성합니다. 장판은 1초마다 적 최대체력의 5% 피해를 주며, 5레벨에는 적 최대체력의 1%를 회복합니다.',
          unlockLevel: 5,
          levels: [
            { cooldown: 15, zones: 1, desc: '쿨다운 20초 · 장판 1개 · 3초간 매초 적 최대체력의 5% 피해' },
            { cooldown: 13, zones: 2, desc: '쿨다운 18초 · 장판 2개 · 3초간 매초 적 최대체력의 5% 피해' },
            { cooldown: 12, zones: 2, desc: '쿨다운 17초 · 장판 2개 · 3초간 매초 적 최대체력의 5% 피해' },
            { cooldown: 11, zones: 3, desc: '쿨다운 16초 · 장판 3개 · 3초간 매초 적 최대체력의 5% 피해' },
            { cooldown: 10, zones: 3, drain: true, desc: '쿨다운 15초 · 장판 3개 · 매초 적 최대체력의 5% 피해 + 피해를 받은 적 최대체력의 1% 회복' },
          ],
        },
      },
    },
    aya: {
      name: '아야',
      tagline: '전술 저격수',
      color: '#ffe14d',
      playable: true,
      skills: {
        s1: {
          name: '2연발',
          desc: '가장 가까운 대상을 향해 2번 빠르게 사격합니다.',
          unlockLevel: 1,
          levels: [
            { damage: 14, cooldown: 5, pierce: 1, desc: '쿨다운 5.0초 · 피해 14×2' },
            { damage: 18, cooldown: 4.5, pierce: 1, desc: '쿨다운 4.5초 · 피해 18×2' },
            { damage: 22, cooldown: 4, pierce: 1, desc: '쿨다운 4.0초 · 피해 22×2' },
            { damage: 27, cooldown: 3.5, pierce: 1, desc: '쿨다운 3.5초 · 피해 27×2' },
            { damage: 33, cooldown: 3, pierce: 3, desc: '쿨다운 3.0초 · 피해 33×2 · 관통' },
          ],
        },
        s2: {
          name: '고정 사격',
          desc: '마우스 방향으로 2.2초 동안 연사합니다.',
          unlockLevel: 3,
          levels: [
            { damage: 10, cooldown: 10, shots: 6, desc: '쿨다운 10초 · 6발 연사 · 발당 피해 10' },
            { damage: 12, cooldown: 9, shots: 7, desc: '쿨다운 9초 · 7발 연사 · 발당 피해 12' },
            { damage: 15, cooldown: 8, shots: 8, desc: '쿨다운 8초 · 8발 연사 · 발당 피해 15' },
            { damage: 18, cooldown: 7, shots: 9, desc: '쿨다운 7초 · 9발 연사 · 발당 피해 18' },
            { damage: 22, cooldown: 6, shots: 10, slow: true, desc: '쿨다운 6초 · 10발 연사 · 발당 피해 22 · 적중 시 3초간 이동속도 30% 감소' },
          ],
        },
        s3: {
          name: '공포탄',
          desc: '하늘로 발사해 주변 적에게 피해를 입히고 공포에 질리게 합니다.',
          unlockLevel: 5,
          levels: [
            { damage: 20, cooldown: 20, desc: '쿨다운 20초 · 피해 20 · 1초 공포' },
            { damage: 25, cooldown: 18, desc: '쿨다운 18초 · 피해 25 · 1초 공포' },
            { damage: 31, cooldown: 17, desc: '쿨다운 17초 · 피해 31 · 1초 공포' },
            { damage: 38, cooldown: 16, desc: '쿨다운 16초 · 피해 38 · 1초 공포' },
            { damage: 46, cooldown: 15, desc: '쿨다운 15초 · 피해 46 · 1초 공포' },
          ],
        },
      },
    },
  };

// ---------- 플레이어 캐릭터 스프라이트 (에이든 / 셀린 / 재키 / 아야 공용 형태, 팔레트만 다름) ----------
const PLAYER_BASE_PATTERN = [
    ['0','0','3','3','3','3','3','3','3','3','0','0'],
    ['0','3','3','2','2','2','2','2','2','3','3','0'],
    ['0','3','2','2','2','2','2','2','2','2','3','0'],
    ['0','1','2','1','2','2','2','1','2','1','0','0'],
    ['0','0','5','5','5','5','5','5','5','5','0','0'],
    ['4','4','4','5','4','4','4','4','5','4','4','4'],
    ['4','4','4','4','4','4','4','4','4','4','4','4'],
    ['4','5','4','4','4','4','4','4','4','4','5','4'],
    ['4','4','4','4','4','4','4','4','4','4','7','4'],
    ['6','6','4','4','4','4','4','4','4','4','6','6'],
    ['0','6','6','6','6','6','6','6','6','6','6','0'],
    ['0','1','1','0','0','0','0','0','0','1','1','0'],
  ];

const PLAYER_SPRITES = {
    aiden: {
      pattern: PLAYER_BASE_PATTERN,
      palette: {
        '1': '#12141c', '2': '#f2c9a0', '3': '#f5f5f5',
        '4': '#f0f0f2', '5': '#1c2230', '6': '#232733', '7': '#66d9ff',
      },
    },
    celine: {
      areaRadiusMult: 1.1,
      pattern: PLAYER_BASE_PATTERN,
      palette: {
        '1': '#1a1610', '2': '#f2c9a0', '3': '#4de8e0',
        '4': '#ff9a3c', '5': '#3a2a12', '6': '#171310', '7': '#5fd0ff',
      },
    },
    jackie: {
      pattern: PLAYER_BASE_PATTERN,
      palette: {
        '1': '#120607', '2': '#f2c9a0', '3': '#1a1a1a',
        '4': '#6b0f24', '5': '#2a0a12', '6': '#1a1a1a', '7': '#ff2e5b',
      },
    },
    aya: {
      pattern: PLAYER_BASE_PATTERN,
      palette: {
        '1': '#141a12', '2': '#f2c9a0', '3': '#e8d24d',
        '4': '#4a5a42', '5': '#2a331f', '6': '#232a1c', '7': '#ffe14d',
      },
    },
  };
