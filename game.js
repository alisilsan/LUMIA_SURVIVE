(function () {
'use strict';

// 이 파일은 index.html에서 config.js / weapons.js / characters.js / enemies.js / items.js 뒤에 일반 <script>로 로드됩니다.
// (전역 스코프를 공유하는 클래식 스크립트 방식 — file:// 로 직접 열어도 동작합니다)


  // ============ 기본 세팅 ============
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  }
  window.addEventListener('resize', resize);
  resize();


  // ============ 입력 ============
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape') {
      e.preventDefault();
      togglePause();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      toggleStatus();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  // 마우스 조준 방향 (재키 힘줄 절단 / 아야 고정 사격 등에서 사용, 터치 기기에서는 이동 방향으로 대체)
  let mouseScreenX = null, mouseScreenY = null;
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseScreenX = e.clientX - rect.left;
    mouseScreenY = e.clientY - rect.top;
  });

  function getAimDirection() {
    if (mouseScreenX !== null && mouseScreenY !== null) {
      const dx = mouseScreenX - W / 2, dy = mouseScreenY - H / 2;
      const d = Math.hypot(dx, dy);
      if (d > 4) return { x: dx / d, y: dy / d };
    }
    return player.dir;
  }

  // 플레이어 반경 내 몬스터 위치 중 랜덤 하나를 목표로, 없으면 주변 랜덤 위치 (낙뢰/메테오/드론 등 공용)
  function pickTargetNearMonster(searchRadius, fallbackMaxDist) {
    const candidates = enemies.filter((e) => !e.dead && Math.hypot(e.x - player.x, e.y - player.y) <= searchRadius);
    if (candidates.length > 0) {
      const c = candidates[Math.floor(Math.random() * candidates.length)];
      return { x: c.x, y: c.y };
    }
    const ang = rand(0, Math.PI * 2);
    const dist = rand(0, fallbackMaxDist);
    return {
      x: clamp(player.x + Math.cos(ang) * dist, WORLD_MIN, WORLD_MAX),
      y: clamp(player.y + Math.sin(ang) * dist, WORLD_MIN, WORLD_MAX),
    };
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      pauseOverlay.classList.remove('hidden');
    } else if (state === 'paused') {
      state = 'playing';
      pauseOverlay.classList.add('hidden');
    }
  }

  let statusPanelCollapsed = false;
  function toggleStatus() {
    statusPanelCollapsed = !statusPanelCollapsed;
    statusPanel.classList.toggle('collapsed', statusPanelCollapsed);
    statusCollapseBtn.textContent = statusPanelCollapsed ? '＋' : '－';
  }

  function levelDots(level, max) {
    let s = '';
    for (let i = 1; i <= max; i++) s += i <= level ? '●' : '○';
    return s;
  }

  function formatCooldownBadge(cooldownTimerMs) {
    if (cooldownTimerMs === undefined || cooldownTimerMs === null) return null;
    if (cooldownTimerMs <= 0) return '준비';
    return (cooldownTimerMs / 1000).toFixed(1) + 's';
  }

  function populateStatusContent() {
    if (!player) return;
    const charDef = CHARACTERS[selectedCharacter];
    let html = '';

    html += `<div class="status-hbar">`;

    // 아바타 + 레벨 배지
    html += `<div class="status-portrait-block">
      <canvas class="status-avatar" id="statusAvatarCanvas" width="56" height="56"></canvas>
      <div class="status-level-badge">${player.level}</div>
    </div>`;

    html += `<div class="status-divider"></div>`;

    // 고유 스킬 + 공통 스킬 아이콘을 한 줄로
    html += `<div class="status-icon-grid">`;
    if (charDef && charDef.skills) {
      for (const skillKey in charDef.skills) {
        const def = charDef.skills[skillKey];
        const owned = player.uniqueSkills[skillKey];
        if (owned) {
          let badge;
          if (def.passive) {
            const now = performance.now();
            badge = isJackieFrenzyActive(now) ? '광기!' : '패시브';
          } else {
            badge = formatCooldownBadge(owned.cooldownTimer);
          }
          html += `<div class="status-icon">
            <div class="cooldown-badge">${badge}</div>
            <div class="swatch" style="background:${charDef.color}">${skillKey.toUpperCase()}</div>
            <div class="dots">${levelDots(owned.level, 5)}</div>
          </div>`;
        } else {
          html += `<div class="status-icon locked">
            <div class="swatch" style="background:#3a3454">🔒</div>
            <div class="lock-label">Lv.${def.unlockLevel}</div>
          </div>`;
        }
      }
    }
    for (const wid in WEAPON_DEFS) {
      const def = WEAPON_DEFS[wid];
      const owned = player.weapons[wid];
      if (owned) {
        const badge = formatCooldownBadge(owned.cooldownTimer);
        html += `<div class="status-icon">
          <div class="cooldown-badge">${badge}</div>
          <div class="swatch" style="background:${def.color}"></div>
          <div class="dots">${levelDots(owned.level, 5)}</div>
        </div>`;
      } else {
        html += `<div class="status-icon locked">
          <div class="swatch" style="background:#3a3454"></div>
          <div class="lock-label">미보유</div>
        </div>`;
      }
    }
    html += `</div>`;

    html += `<div class="status-divider"></div>`;

    // HP / EXP 바
    const hpPct = clamp((player.hp / player.maxHp) * 100, 0, 100);
    const xpPct = clamp((player.xp / player.xpToNext) * 100, 0, 100);
    html += `<div class="status-bars-col">
      <div class="status-bar-row">
        <div class="status-bar-toprow"><span class="status-bar-label">HP</span><span>${Math.ceil(player.hp)}/${player.maxHp}</span></div>
        <div class="status-bar-track"><div class="status-bar-fill hp-fill" style="width:${hpPct}%"></div></div>
      </div>
      <div class="status-bar-row">
        <div class="status-bar-toprow"><span class="status-bar-label">EXP</span><span>${Math.floor(player.xp)}/${player.xpToNext}</span></div>
        <div class="status-bar-track"><div class="status-bar-fill xp-fill" style="width:${xpPct}%"></div></div>
      </div>
    </div>`;

    html += `</div>`; // status-hbar

    // 활성 아이템 버프
    if (player.itemBuffs.lightning.timeLeft > 0 || player.itemBuffs.ruin.timeLeft > 0) {
      html += `<div class="status-stat-row" style="margin-top:8px;">`;
      if (player.itemBuffs.lightning.timeLeft > 0) {
        html += `<div class="status-stat-chip active" style="color:#f4d35e;border-color:#f4d35e;">⚡ 번개의 룬 ${Math.ceil(player.itemBuffs.lightning.timeLeft)}s</div>`;
      }
      if (player.itemBuffs.ruin.timeLeft > 0) {
        html += `<div class="status-stat-chip active" style="color:#c65eff;border-color:#c65eff;">☠ 파멸의 룬 ${Math.ceil(player.itemBuffs.ruin.timeLeft)}s</div>`;
      }
      html += `</div>`;
    }

    // 능력치 강화 (작은 칩 목록, 하단에 별도 줄)
    html += `<div class="status-stat-row" style="margin-top:8px;">`;
    for (const sid in STAT_DEFS) {
      const s = STAT_DEFS[sid];
      const picks = player.statPicks[sid] || 0;
      html += `<div class="status-stat-chip${picks > 0 ? ' active' : ''}">${s.title} ${picks}/5</div>`;
    }
    html += `</div>`;

    statusContentEl.innerHTML = html;

    const avatarCanvas = document.getElementById('statusAvatarCanvas');
    if (avatarCanvas && PLAYER_SPRITES[selectedCharacter]) {
      renderAvatarSprite(avatarCanvas, PLAYER_SPRITES[selectedCharacter]);
    }
  }

  function keyboardVector() {
    let x = 0, y = 0;
    if (keys['a'] || keys['arrowleft']) x -= 1;
    if (keys['d'] || keys['arrowright']) x += 1;
    if (keys['w'] || keys['arrowup']) y -= 1;
    if (keys['s'] || keys['arrowdown']) y += 1;
    const len = Math.hypot(x, y);
    if (len > 0) { x /= len; y /= len; }
    return { x, y, mag: len > 0 ? 1 : 0 };
  }

  // 터치 조이스틱
  const joystickZone = document.getElementById('joystickZone');
  const joystickBase = document.getElementById('joystickBase');
  const joystickKnob = document.getElementById('joystickKnob');
  let touchId = null;
  let touchVector = { x: 0, y: 0, mag: 0 };

  function startTouch(e) {
    const t = e.changedTouches[0];
    touchId = t.identifier;
    const rect = gameContainerRect();
    joystickBase.style.left = (t.clientX - rect.left - 50) + 'px';
    joystickBase.style.top = (t.clientY - rect.top - 50) + 'px';
    joystickBase.style.display = 'block';
    joystickKnob.style.left = '50%';
    joystickKnob.style.top = '50%';
    e.preventDefault();
  }

  function moveTouch(e) {
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      const rect = joystickBase.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = t.clientX - cx;
      let dy = t.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, JOY_RADIUS);
      const ang = Math.atan2(dy, dx);
      const kx = Math.cos(ang) * clamped;
      const ky = Math.sin(ang) * clamped;
      joystickKnob.style.left = (50 + (kx / 100) * 100) + '%';
      joystickKnob.style.top = (50 + (ky / 100) * 100) + '%';
      const mag = clamped / JOY_RADIUS;
      touchVector = { x: dist > 0 ? dx / dist : 0, y: dist > 0 ? dy / dist : 0, mag };
      e.preventDefault();
    }
  }

  function endTouch(e) {
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      touchId = null;
      touchVector = { x: 0, y: 0, mag: 0 };
      joystickBase.style.display = 'none';
      e.preventDefault();
    }
  }

  function gameContainerRect() {
    return document.getElementById('gameContainer').getBoundingClientRect();
  }

  joystickZone.addEventListener('touchstart', startTouch, { passive: false });
  window.addEventListener('touchmove', moveTouch, { passive: false });
  window.addEventListener('touchend', endTouch, { passive: false });
  window.addEventListener('touchcancel', endTouch, { passive: false });

  function moveVector() {
    return touchId !== null ? touchVector : keyboardVector();
  }

  // ============ 유틸 ============
  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ============ 무기 정의 ============
  // ============ 캐릭터 & 고유 스킬 ============

  let selectedCharacter = 'aiden';


  // 8x8 픽셀아트 패턴 ('0' = 투명, 그 외 숫자는 팔레트 색상 키)

  function drawSpriteData(sx, sy, radius, sprite, hitFlash, sizeMult) {
    if (!sprite) return false;
    const size = sprite.pattern.length;
    const cell = (radius * sizeMult) / size;
    const startX = sx - (cell * size) / 2;
    const startY = sy - (cell * size) / 2;

    if (hitFlash > 0) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffffff';
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (sprite.pattern[r][c] === '0') continue;
          ctx.fillRect(startX + c * cell, startY + r * cell, cell + 0.6, cell + 0.6);
        }
      }
      ctx.globalAlpha = 1;
      return true;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const sym = sprite.pattern[r][c];
        if (sym === '0') continue;
        ctx.fillStyle = sprite.palette[sym];
        ctx.fillRect(startX + c * cell, startY + r * cell, cell + 0.6, cell + 0.6);
      }
    }
    return true;
  }

  function drawPixelEnemy(sx, sy, radius, spriteKey, hitFlash) {
    return drawSpriteData(sx, sy, radius, ENEMY_SPRITES[spriteKey], hitFlash, 2.3);
  }

  function drawBossSprite(sx, sy, radius, bossKey, hitFlash) {
    return drawSpriteData(sx, sy, radius, BOSS_SPRITES[bossKey], hitFlash, 2.3);
  }

  function drawBossTelegraph(e, sx, sy, toScreenX, toScreenY) {
    if (e.telegraph) {
      const t = e.telegraph;
      const progress = t.executed ? 1 : clamp(1 - t.timer / t.duration, 0, 1);
      const alpha = t.executed ? 0.9 : 0.25 + 0.5 * progress;

      switch (t.type) {
        case 'semilaser': {
          const ang = Math.atan2(t.data.dir.y, t.data.dir.x);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = t.executed ? '#ffffff' : '#ff6b95';
          ctx.lineWidth = t.executed ? 16 : 5;
          ctx.beginPath();
          ctx.arc(sx, sy, 120, ang - Math.PI / 2, ang + Math.PI / 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'zone': {
          const zx = toScreenX(t.data.x), zy = toScreenY(t.data.y);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = t.data.color || '#ff5fd2';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(zx, zy, 110 * (t.executed ? 1 : progress), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'laser': {
          const dir = t.data.dir;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = t.executed ? '#ffffff' : '#ff5fd2';
          ctx.lineWidth = t.executed ? 10 : 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + dir.x * 1000, sy + dir.y * 1000);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'summon': {
          ctx.globalAlpha = alpha * 0.85;
          ctx.strokeStyle = '#ff3b3b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sx, sy, 40 + progress * 45, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'syringe': {
          const ang = Math.atan2(t.data.dir.y, t.data.dir.x);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = '#8ee62c';
          ctx.lineWidth = 2;
          [-0.32, 0, 0.32].forEach((off) => {
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(ang + off) * 260, sy + Math.sin(ang + off) * 260);
            ctx.stroke();
          });
          ctx.globalAlpha = 1;
          break;
        }
        case 'dash': {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = '#ff2e5b';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(sx, sy, e.radius + 12 + progress * 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
      }
    }

    if (e.bossType === 'weakline' && e.ai && e.ai.dashState === 'dashing') {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#ff2e5b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, e.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- 보스 5종 (10 / 20 / 30 / 40 / 50 레벨마다 등장, 이후 순환) ----------

  // ---------- 플레이어 캐릭터 스프라이트 (에이든 / 셀린 공용 형태, 팔레트만 다름) ----------


  function drawPlayerSprite(sx, sy, radius, charKey, hitFlash) {
    return drawSpriteData(sx, sy, radius, PLAYER_SPRITES[charKey], hitFlash, 2.3);
  }

  // 캐릭터 선택 카드용 소형 아바타 렌더링 (별도의 작은 캔버스에 그림)
  function renderAvatarSprite(canvasEl, sprite) {
    const actx = canvasEl.getContext('2d');
    const size = sprite.pattern.length;
    const cell = canvasEl.width / size;
    actx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const sym = sprite.pattern[r][c];
        if (sym === '0') continue;
        actx.fillStyle = sprite.palette[sym];
        actx.fillRect(c * cell, r * cell, cell + 0.6, cell + 0.6);
      }
    }
  }

  // ============ 게임 상태 ============
  let state = 'start'; // start | playing | paused | levelup | gameover | victory
  let player, enemies, projectiles, xpGems, particles;
  let hazardZones, enemyProjectiles, lightningStrikes, itemDrops, arcFlashes, skillPulses;
  let elapsed, kills, spawnTimer, bossLevelsSpawned;
  let shakeTimer = 0, shakeMag = 0;
  let bossAnnounceText = null, bossAnnounceTimer = 0;
  let itemAnnounceText = null, itemAnnounceTimer = 0;

  function initGame() {
    const isJackie = selectedCharacter === 'jackie';
    player = {
      x: 0, y: 0, radius: 14,
      hp: isJackie ? 120 : 100, maxHp: isJackie ? 120 : 100,
      speed: 200, speedMult: 1,
      damageMult: isJackie ? 1.1 : 1, // 근접 캐릭터 보정: 데미지 +10%
      regen: 0,
      regenPercent: 0,
      lifestealPct: 0,
      xpBonusPct: 0,
      rerollsLeft: 3,
      cooldownMult: 1, // 델루리안 타임피스 효과. 공통 스킬(무기)에만 적용 — 캐릭터 고유 스킬 쿨타임에는 사용 금지
      magnetRadius: 90,
      level: 1, xp: 0, xpToNext: calcXpToNext(1),
      dir: { x: 0, y: -1 },
      invulnUntil: 0,
      fullInvulnUntil: 0,
      kx: 0, ky: 0,
      dots: [],
      itemBuffs: {
        lightning: { timeLeft: 0, tickTimer: 0 },
        ruin: { timeLeft: 0, tickTimer: 0 },
      },
      statPicks: { speed: 0, hp: 0, cdr: 0, magnet: 0, guardianSuit: 0, burgundy47: 0, fateDice: 0, yomyeongwol: 0 },
      jackieKillStreak: 0,
      bloodFrenzyUntil: 0,
      basicAttackTimer: 0,
      uniqueSkills: {},
      weapons: {},
    };
    enemies = [];
    projectiles = [];
    xpGems = [];
    particles = [];
    hazardZones = [];
    enemyProjectiles = [];
    lightningStrikes = [];
    itemDrops = [];
    arcFlashes = [];
    skillPulses = [];
    elapsed = 0;
    kills = 0;
    spawnTimer = 0;
    bossLevelsSpawned = new Set();
    shakeTimer = 0;
    bossAnnounceText = null;
    bossAnnounceTimer = 0;
    itemAnnounceText = null;
    itemAnnounceTimer = 0;

    // 캐릭터 고유 스킬: 시작 레벨(1)에 이미 해금 조건을 만족하는 스킬은 자동으로 1레벨 습득
    grantAutoUnlockedSkills();
  }

  function grantAutoUnlockedSkills() {
    const charDef = CHARACTERS[selectedCharacter];
    if (!charDef || !charDef.skills) return;
    for (const skillKey in charDef.skills) {
      const def = charDef.skills[skillKey];
      if (player.level >= def.unlockLevel && !player.uniqueSkills[skillKey]) {
        player.uniqueSkills[skillKey] = { level: 1, cooldownTimer: 0 };
      }
    }
  }

  function calcXpToNext(level) {
    return Math.round(5 + level * 4 + level * level * 0.5);
  }

  // ============ 스폰 ============
  function difficultyTier() {
    return Math.floor(elapsed / 30);
  }

  function updateSpawning(dt) {
    const tier = difficultyTier();
    const spawnInterval = Math.max(230, 1500 - tier * 40);
    const batch = 1 + Math.floor(tier / 4);
    spawnTimer -= dt * 1000;
    if (spawnTimer <= 0) {
      spawnTimer = spawnInterval;
      if (enemies.length < MAX_ENEMIES) {
        for (let i = 0; i < batch; i++) spawnEnemy(tier);
      }
    }
  }

  function spawnPosAroundPlayer(minDist) {
    const ang = rand(0, Math.PI * 2);
    let x = player.x + Math.cos(ang) * minDist;
    let y = player.y + Math.sin(ang) * minDist;
    x = clamp(x, WORLD_MIN, WORLD_MAX);
    y = clamp(y, WORLD_MIN, WORLD_MAX);
    return { x, y };
  }

  function spawnEnemy(tier) {
    const typeKey = pick(['wolf', 'bear', 'chicken']);
    const def = ENEMY_DEFS[typeKey];
    const hpMult = 1 + tier * 0.12;
    const dmgMult = 1 + tier * 0.08;
    const speedMult = Math.min(1.5, 1 + tier * 0.02);
    const pos = spawnPosAroundPlayer(Math.max(W, H) * 0.65 + 120);
    enemies.push({
      x: pos.x, y: pos.y,
      hp: def.hp * hpMult, maxHp: def.hp * hpMult,
      dmg: def.dmg * dmgMult,
      speed: def.speed * speedMult,
      radius: def.radius,
      color: def.color,
      xpValue: def.xp,
      type: typeKey,
      isBoss: false,
      hitFlash: 0,
      dead: false,
      lastOrbHitTime: 0,
    });
  }

  function spawnBoss(level) {
    const pos = spawnPosAroundPlayer(Math.max(W, H) * 0.55 + 100);
    const hp = (300 + level * 45) * 3; // 체력 3배
    const bossIndex = Math.floor(level / 10) - 1;
    const bossKey = BOSS_ORDER[bossIndex % BOSS_ORDER.length];
    enemies.push({
      x: pos.x, y: pos.y,
      hp, maxHp: hp,
      dmg: 20 + level * 3,
      speed: 72 * 2, // 이동속도 2배
      radius: 36,
      color: '#ff2e5b',
      xpValue: 50 + level * 5,
      type: 'boss',
      bossType: bossKey,
      bossMilestoneLevel: level,
      isBoss: true,
      hitFlash: 0,
      dead: false,
      lastOrbHitTime: 0,
      facing: { x: -1, y: 0 },
      ai: createBossAI(bossKey),
      telegraph: null,
    });
    bossAnnounceText = `보스 등장: ${BOSS_NAMES[bossKey]}`;
    bossAnnounceTimer = 2.6;
  }

  // ============ 플레이어 & 무기 업데이트 ============
  function updatePlayer(dt) {
    const mv = moveVector();
    if (mv.mag > 0.05) {
      player.dir = { x: mv.x, y: mv.y };
      const frenzyMult = isJackieFrenzyActive(performance.now()) ? 1.2 : 1;
      const speed = player.speed * player.speedMult * frenzyMult * mv.mag;
      player.x += mv.x * speed * dt;
      player.y += mv.y * speed * dt;
      player.x = clamp(player.x, WORLD_MIN + player.radius, WORLD_MAX - player.radius);
      player.y = clamp(player.y, WORLD_MIN + player.radius, WORLD_MAX - player.radius);
    }
    if (player.regen > 0 && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);
    }
    if (player.regenPercent > 0 && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp * player.regenPercent * dt);
    }
  }

  function updateWeapons(dt, now) {
    for (const wid in player.weapons) {
      const w = player.weapons[wid];
      const def = WEAPON_DEFS[wid];
      const stat = def.levels[w.level - 1];

      w.cooldownTimer -= dt * 1000;
      if (w.cooldownTimer <= 0) {
        w.cooldownTimer += stat.cooldown * player.cooldownMult; // 공통 스킬(무기)만 쿨타임 감소 적용
        if (wid === 'missile') fireMissile(stat, def);
        else if (wid === 'protocol') fireProtocolBreach(stat, def);
        else if (wid === 'truthblade') fireTruthBlade(stat, def);
        else if (wid === 'meteor') fireMeteor(stat, def);
        else if (wid === 'weaken') fireWeaken(stat, def);
      }
    }
  }

  function fireMissile(stat, def) {
    if (enemies.length === 0) return;
    const alive = enemies.filter((e) => !e.dead);
    alive.sort((a, b) => distSq(a, player) - distSq(b, player));
    const targets = alive.slice(0, stat.count);
    for (const target of targets) {
      projectiles.push({
        type: 'missile',
        x: player.x, y: player.y,
        vx: 0, vy: 0,
        target,
        speed: stat.speed,
        damage: stat.damage,
        splash: stat.splash,
        radius: 7,
        life: 3.2,
        color: def.color,
      });
    }
  }

  function fireProtocolBreach(stat, def) {
    const pos = pickTargetNearMonster(300, 420);
    explodeAt(pos.x, pos.y, stat.damage, stat.radius, def.color, 'burst');
    spawnHitBurst(pos.x, pos.y, def.color);
  }

  function fireTruthBlade(stat, def) {
    explodeAt(player.x, player.y, stat.damage, stat.radius, def.color, 'ring');
  }

  function fireMeteor(stat, def) {
    const pos = pickTargetNearMonster(300, 420);
    explodeAt(pos.x, pos.y, stat.damage, stat.radius, def.color, 'burst');
    lightningStrikes.push({ x: pos.x, y: pos.y, radius: stat.radius * 0.6, timer: 0.35, color: def.color });
  }

  function fireWeaken(stat, def) {
    const pos = pickTargetNearMonster(300, 420);
    hazardZones.push({
      x: pos.x, y: pos.y, radius: stat.radius,
      target: 'enemies', slowPct: 0.4, tickInterval: 0.3, tickTimer: 0,
      life: stat.duration, color: def.color,
    });
  }

  // ============ 캐릭터 고유 스킬 ============
  function updateUniqueSkills(dt, now) {
    const charDef = CHARACTERS[selectedCharacter];
    if (!charDef) return;
    for (const skillKey in player.uniqueSkills) {
      const w = player.uniqueSkills[skillKey];
      const def = charDef.skills[skillKey];
      if (!def || def.passive) continue; // 패시브 스킬은 쿨타임 발동식이 아님
      const stat = def.levels[w.level - 1];

      w.cooldownTimer -= dt * 1000;
      if (w.cooldownTimer <= 0) {
        // 고유 스킬 쿨타임에는 델루리안 타임피스(cooldownMult)를 적용하지 않는다
        w.cooldownTimer += stat.cooldown * 1000;
        fireUniqueSkill(skillKey, stat);
      }
    }
    updatePendingSkillRepeats(dt);
    updateSkillChannels(dt, now);
  }

  function fireUniqueSkill(skillKey, stat) {
    if (selectedCharacter === 'aiden') {
      if (skillKey === 's1') fireAidenRailgun(stat);
      else if (skillKey === 's2') fireAidenDischarge(stat);
      else if (skillKey === 's3') fireAidenLightning(stat);
    } else if (selectedCharacter === 'celine') {
      if (skillKey === 's1') fireCelinePlasma(stat);
      else if (skillKey === 's2') fireCelineBlast(stat);
      else if (skillKey === 's3') fireCelineFusion(stat);
    } else if (selectedCharacter === 'jackie') {
      if (skillKey === 's1') fireJackieTendonCut(stat);
      else if (skillKey === 's3') fireJackieRaiderBreath(stat);
    } else if (selectedCharacter === 'aya') {
      if (skillKey === 's1') fireAyaDoubleShot(stat);
      else if (skillKey === 's2') fireAyaSuppressiveFire(stat);
      else if (skillKey === 's3') fireAyaFearRound(stat);
    }
  }

  // ---- 기본 공격 (모든 캐릭터 공용) ----
  // 강화 불가, 상태창 UI에 표시하지 않음, 델루리안 타임피스(쿨타임 감소) 적용 안 함. 고정 쿨다운 3초.
  const BASIC_ATTACK_COOLDOWN_MS = 3000;
  const BASIC_ATTACK_DAMAGE = 10;

  function updateBasicAttack(dt) {
    player.basicAttackTimer -= dt * 1000;
    if (player.basicAttackTimer <= 0) {
      player.basicAttackTimer += BASIC_ATTACK_COOLDOWN_MS;
      fireBasicAttack();
    }
  }

  function fireBasicAttack() {
    if (selectedCharacter === 'aiden') meleeBasicAttack(100, 70, CHARACTERS.aiden.color);
    else if (selectedCharacter === 'celine') projectileBasicAttack(200, CHARACTERS.celine.color);
    else if (selectedCharacter === 'jackie') meleeBasicAttack(100, 70, CHARACTERS.jackie.color);
    else if (selectedCharacter === 'aya') projectileBasicAttack(200, CHARACTERS.aya.color);
  }

  // 에이든(뇌격) / 재키(휘두르기): 반경 내 가장 가까운 적 방향으로 검을 휘두름
  function meleeBasicAttack(radius, coneDeg, color) {
    const aim = dirToNearestInRadius(radius);
    if (!aim) return;
    const coneRad = (coneDeg * Math.PI) / 180;
    const angleToEdge = Math.cos(coneRad / 2);
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > radius) continue;
      const dot = (dx / dist) * aim.x + (dy / dist) * aim.y;
      if (dot >= angleToEdge) damageEnemy(e, BASIC_ATTACK_DAMAGE);
    }
    arcFlashes.push({ x: player.x, y: player.y, dir: { x: aim.x, y: aim.y }, timer: 0.15, maxTimer: 0.15, color, coneRad, range: radius });
  }

  // 셀린(콩알탄) / 아야(위협 사격): 반경 내 가장 가까운 적 방향으로 투사체 발사
  function projectileBasicAttack(radius, color) {
    const aim = dirToNearestInRadius(radius);
    if (!aim) return;
    projectiles.push({
      type: 'bolt',
      x: player.x, y: player.y,
      vx: aim.x * 480, vy: aim.y * 480,
      damage: BASIC_ATTACK_DAMAGE,
      pierce: 1,
      radius: 5,
      life: 1.4,
      color,
      hitSet: new Set(),
    });
  }

  // ---- 상태이상 (슬로우/속박) ----
  function applySlow(e, pct, durationSec, now) {
    e.slowFactor = 1 - pct;
    e.slowUntil = now + durationSec * 1000;
  }

  function applyRoot(e, durationSec, now) {
    e.rootUntil = now + durationSec * 1000;
  }

  function applyFear(e, durationSec, now) {
    e.fearUntil = now + durationSec * 1000;
  }

  function applyBleed(e, percentMaxHp, tickInterval, durationSec) {
    e.bleed = {
      percentMaxHp,
      tickInterval,
      tickTimer: tickInterval,
      ticksLeft: Math.round(durationSec / tickInterval),
    };
  }

  function updateEnemyStatuses(dt) {
    for (const e of enemies) {
      if (e.dead || !e.bleed) continue;
      e.bleed.tickTimer -= dt;
      if (e.bleed.tickTimer <= 0) {
        e.bleed.tickTimer += e.bleed.tickInterval;
        damageEnemy(e, e.maxHp * e.bleed.percentMaxHp);
        e.bleed.ticksLeft -= 1;
        if (e.bleed.ticksLeft <= 0) e.bleed = null;
      }
    }
  }

  function effectiveSpeed(e, now) {
    if (e.rootUntil && now < e.rootUntil) return 0;
    if (e.slowUntil && now < e.slowUntil) return e.speed * (e.slowFactor || 1);
    return e.speed;
  }

  // ---- 범용 이펙트 ----
  function spawnPulse(x, y, maxRadius, color, style) {
    skillPulses.push({ x, y, radius: 4, maxRadius, alpha: 0.85, color, style: style || 'burst' });
  }

  function shoveEnemy(e, fromX, fromY, distance) {
    const dx = e.x - fromX, dy = e.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    e.x = clamp(e.x + (dx / d) * distance, WORLD_MIN, WORLD_MAX);
    e.y = clamp(e.y + (dy / d) * distance, WORLD_MIN, WORLD_MAX);
  }

  function castLightningBoltAt(x, y, damage, radius, color) {
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= radius) damageEnemy(e, damage);
    }
    lightningStrikes.push({ x, y, radius, timer: 0.35, color: color || '#f4d35e' });
  }

  function castLightningBolt(damage, radius, color) {
    const ang = rand(0, Math.PI * 2);
    const dist = rand(0, 420);
    const x = clamp(player.x + Math.cos(ang) * dist, WORLD_MIN, WORLD_MAX);
    const y = clamp(player.y + Math.sin(ang) * dist, WORLD_MIN, WORLD_MAX);
    castLightningBoltAt(x, y, damage, radius, color);
  }

  function explodeAt(x, y, damage, radius, color, style) {
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= radius) damageEnemy(e, damage);
    }
    spawnPulse(x, y, radius, color, style);
  }

  function updatePendingSkillRepeats(dt) {
    for (const key in player.uniqueSkills) {
      const w = player.uniqueSkills[key];
      if (!w.pendingRepeat) continue;
      w.pendingRepeat.timer -= dt;
      if (w.pendingRepeat.timer <= 0) {
        const r = w.pendingRepeat;
        explodeAt(r.x, r.y, r.damage, r.radius, r.color, r.style);
        if (r.style === 'burst') spawnHitBurst(r.x, r.y, r.color);
        r.remaining -= 1;
        r.timer = 0.3;
        if (r.remaining <= 0) w.pendingRepeat = null;
      }
    }
  }

  // ---- 에이든 (모든 스킬 이펙트 색상 통일: CHARACTERS.aiden.color) ----
  function fireAidenRailgun(stat) {
    const now = performance.now();
    const myColor = CHARACTERS.aiden.color;
    const nearest = findNearestEnemy();
    const ang = nearest
      ? Math.atan2(nearest.y - player.y, nearest.x - player.x)
      : Math.atan2(player.dir.y, player.dir.x);
    projectiles.push({
      type: 'bolt',
      x: player.x, y: player.y,
      vx: Math.cos(ang) * 480, vy: Math.sin(ang) * 480,
      damage: stat.damage,
      pierce: 1,
      radius: 6,
      life: 1.6,
      color: myColor,
      hitSet: new Set(),
      onHit: stat.slow ? (e) => applySlow(e, 0.3, 0.5, now) : null,
    });
  }

  function fireAidenDischarge(stat) {
    const now = performance.now();
    const myColor = CHARACTERS.aiden.color;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d <= stat.radius) {
        damageEnemy(e, stat.damage);
        applySlow(e, 0.3, 0.5, now);
        if (stat.root) applyRoot(e, 1.0, now);
      }
    }
    spawnPulse(player.x, player.y, stat.radius, myColor);
  }

  function fireAidenLightning(stat) {
    const strikes = stat.strikes || 1;
    for (let i = 0; i < strikes; i++) {
      const pos = pickTargetNearMonster(300, 420);
      castLightningBoltAt(pos.x, pos.y, stat.damage, 90, CHARACTERS.aiden.color);
    }
  }

  // ---- 셀린 (스킬별로 색상/형태/모션을 뚜렷하게 구분) ----
  const CELINE_PLASMA_COLOR = '#ff9a3c'; // 주황 - 강한 단일 폭발
  const CELINE_BLAST_COLOR = '#ff4d6d';  // 붉은 핑크 - 충격파
  const CELINE_FUSION_COLOR = '#c65eff'; // 보라 - 자기장 수렴

  function fireCelinePlasma(stat) {
    const target = findNearestEnemy();
    const x = target ? target.x : clamp(player.x + player.dir.x * 150, WORLD_MIN, WORLD_MAX);
    const y = target ? target.y : clamp(player.y + player.dir.y * 150, WORLD_MIN, WORLD_MAX);
    explodeAt(x, y, stat.damage, stat.radius, CELINE_PLASMA_COLOR, 'burst');
    spawnHitBurst(x, y, CELINE_PLASMA_COLOR);
    if (stat.multiHit) {
      player.uniqueSkills.s1.pendingRepeat = {
        remaining: stat.multiHit - 1, timer: 0.3,
        x, y, damage: stat.damage, radius: stat.radius, color: CELINE_PLASMA_COLOR, style: 'burst',
      };
    }
  }

  function fireCelineBlast(stat) {
    const cx = clamp(player.x + player.dir.x * 120, WORLD_MIN, WORLD_MAX);
    const cy = clamp(player.y + player.dir.y * 120, WORLD_MIN, WORLD_MAX);
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d <= stat.radius) {
        damageEnemy(e, stat.damage);
        shoveEnemy(e, cx, cy, 70);
      }
    }
    spawnPulse(cx, cy, stat.radius, CELINE_BLAST_COLOR, 'ring');
    if (stat.zone) {
      hazardZones.push({
        x: cx, y: cy, radius: stat.radius,
        target: 'enemies', percentCurrentHp: 0.05,
        tickInterval: 0.2, tickTimer: 0, life: 1.0, color: CELINE_BLAST_COLOR,
      });
    }
  }

  function fireCelineFusion(stat) {
    const ang = rand(0, Math.PI * 2);
    const dist = rand(0, 380);
    const x = clamp(player.x + Math.cos(ang) * dist, WORLD_MIN, WORLD_MAX);
    const y = clamp(player.y + Math.sin(ang) * dist, WORLD_MIN, WORLD_MAX);
    explodeAt(x, y, stat.damage, stat.radius, CELINE_FUSION_COLOR, 'converge');
    if (stat.zone) {
      hazardZones.push({
        x, y, radius: stat.radius,
        target: 'enemies', percentCurrentHp: 0.05,
        tickInterval: 0.5, tickTimer: 0, life: 3.0, color: CELINE_FUSION_COLOR,
      });
    }
  }

  // ---- 재키 ----
  function fireJackieTendonCut(stat) {
    const now = performance.now();
    const myColor = CHARACTERS.jackie.color;
    const aim = dirToNearestInRadius(100);
    if (!aim) return; // 반경 100 내 적이 없으면 발동하지 않음
    const dir = aim;
    const coneRad = (stat.coneDeg * Math.PI) / 180;
    const range = 140;
    let hitAny = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > range) continue;
      const dot = (dx / dist) * dir.x + (dy / dist) * dir.y;
      const angleToEdge = Math.cos(coneRad / 2);
      if (dot >= angleToEdge) {
        damageEnemy(e, stat.damage);
        applyBleed(e, 0.05, 1, 3);
        if (stat.slow) applySlow(e, 0.3, 3, now);
        hitAny = true;
      }
    }
    // 부채꼴 이펙트 (짧게 표시)
    arcFlashes.push({ x: player.x, y: player.y, dir: { x: dir.x, y: dir.y }, timer: 0.2, maxTimer: 0.2, color: myColor, coneRad, range });
  }

  function fireJackieRaiderBreath(stat) {
    const now = performance.now();
    const myColor = CHARACTERS.jackie.color;
    const candidates = enemies.filter((e) => !e.dead && Math.hypot(e.x - player.x, e.y - player.y) <= 100);
    if (candidates.length === 0) return;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    player.x = clamp(target.x, WORLD_MIN, WORLD_MAX);
    player.y = clamp(target.y, WORLD_MIN, WORLD_MAX);
    const radius = 130;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d <= radius) {
        damageEnemy(e, stat.damage);
        applyRoot(e, 1.0, now);
        if (stat.bloodZone) applyBleed(e, 0.05, 1, 3);
      }
    }
    spawnPulse(player.x, player.y, radius, myColor, 'burst');
    spawnHitBurst(player.x, player.y, myColor);
    player.fullInvulnUntil = now + 1000; // 착지 후 1초간 완전 무적
    if (stat.bloodZone) {
      hazardZones.push({
        x: player.x, y: player.y, radius,
        target: 'enemies', bleedZone: true,
        tickInterval: 1.0, tickTimer: 0, life: 3.0,
        color: myColor, jackieBloodZone: true,
      });
    }
  }

  // ---- 아야 ----
  function fireAyaDoubleShot(stat) {
    const myColor = CHARACTERS.aya.color;
    const nearest = findNearestEnemy();
    const baseAng = nearest
      ? Math.atan2(nearest.y - player.y, nearest.x - player.x)
      : Math.atan2(player.dir.y, player.dir.x);
    [-0.06, 0.06].forEach((off) => {
      const ang = baseAng + off;
      projectiles.push({
        type: 'bolt',
        x: player.x, y: player.y,
        vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520,
        damage: stat.damage,
        pierce: stat.pierce,
        radius: 6,
        life: 1.4,
        color: myColor,
        hitSet: new Set(),
      });
    });
  }

  function fireAyaSuppressiveFire(stat) {
    const totalDuration = 2.2;
    player.uniqueSkills.s2.channel = {
      shotsLeft: stat.shots,
      interval: totalDuration / stat.shots,
      timer: 0,
      damage: stat.damage,
      slow: !!stat.slow,
    };
  }

  function fireAyaFearRound(stat) {
    const now = performance.now();
    const myColor = CHARACTERS.aya.color;
    const radius = 180;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d <= radius) {
        damageEnemy(e, stat.damage);
        applyFear(e, 1.0, now);
      }
    }
    spawnPulse(player.x, player.y, radius, myColor, 'ring');
  }

  function updateSkillChannels(dt, now) {
    for (const key in player.uniqueSkills) {
      const w = player.uniqueSkills[key];
      if (!w.channel) continue;
      const c = w.channel;
      c.timer -= dt;
      if (c.timer <= 0) {
        c.timer += c.interval;
        // 매 발사 시점마다 반경 200 내 가장 가까운 적 방향으로 재조준
        const aim = dirToNearestInRadius(200);
        if (aim) {
          projectiles.push({
            type: 'bolt',
            x: player.x, y: player.y,
            vx: aim.x * 560, vy: aim.y * 560,
            damage: c.damage,
            pierce: 1,
            radius: 5,
            life: 1.2,
            color: CHARACTERS.aya.color,
            hitSet: new Set(),
            onHit: c.slow ? (e) => applySlow(e, 0.3, 3, now) : null,
          });
        }
        c.shotsLeft -= 1;
        if (c.shotsLeft <= 0) w.channel = null;
      }
    }
  }

  function distSq(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function findNearestEnemy() {
    let best = null, bestDist = Infinity;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = distSq(e, player);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  // 지정 반경 내에서 가장 가까운 적을 찾아 그 방향(단위 벡터)을 반환. 없으면 null.
  function dirToNearestInRadius(radius) {
    let best = null, bestDist = Infinity;
    const r2 = radius * radius;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = distSq(e, player);
      if (d <= r2 && d < bestDist) { bestDist = d; best = e; }
    }
    if (!best) return null;
    const dx = best.x - player.x, dy = best.y - player.y;
    const dist = Math.hypot(dx, dy) || 1;
    return { x: dx / dist, y: dy / dist, target: best };
  }

  // ============ 발사체 업데이트 ============
  function updateProjectiles(dt) {
    for (const p of projectiles) {
      if (p.type === 'bolt') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        for (const e of enemies) {
          if (e.dead || p.hitSet.has(e)) continue;
          const dx = e.x - p.x, dy = e.y - p.y;
          const rr = (e.radius + p.radius) * (e.radius + p.radius);
          if (dx * dx + dy * dy < rr) {
            damageEnemy(e, p.damage);
            if (p.onHit) p.onHit(e);
            p.hitSet.add(e);
            p.pierce -= 1;
            if (p.pierce < 0) { p.life = -1; break; }
          }
        }
      } else if (p.type === 'missile') {
        let target = p.target;
        if (target && !target.dead) {
          const dx = target.x - p.x, dy = target.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          p.vx = (dx / d) * p.speed;
          p.vy = (dy / d) * p.speed;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;

        let hit = false;
        if (target && !target.dead) {
          const dx = target.x - p.x, dy = target.y - p.y;
          if (Math.hypot(dx, dy) < target.radius + p.radius) hit = true;
        }
        if (hit) {
          damageEnemy(target, p.damage);
          for (const e of enemies) {
            if (e.dead || e === target) continue;
            const d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d <= p.splash) damageEnemy(e, Math.round(p.damage * 0.5));
          }
          spawnHitBurst(p.x, p.y, p.color);
          p.life = -1;
        }
      }
    }
    projectiles = projectiles.filter((p) => {
      if (p.life <= 0) return false;
      if (p.x < WORLD_MIN - 300 || p.x > WORLD_MAX + 300) return false;
      if (p.y < WORLD_MIN - 300 || p.y > WORLD_MAX + 300) return false;
      return true;
    });
  }

  // ============ 적 업데이트 ============
  function updateEnemies(dt, now) {
    for (const e of enemies) {
      if (e.dead) continue;

      if (e.isBoss) {
        updateBossAI(e, dt, now);
      } else {
        const dx = player.x - e.x, dy = player.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const spd = effectiveSpeed(e, now);
        const feared = e.fearUntil && now < e.fearUntil;
        const sign = feared ? -1 : 1;
        e.x += sign * (dx / d) * spd * dt;
        e.y += sign * (dy / d) * spd * dt;
        e.x = clamp(e.x, WORLD_MIN, WORLD_MAX);
        e.y = clamp(e.y, WORLD_MIN, WORLD_MAX);
      }

      if (e.hitFlash > 0) e.hitFlash -= dt * 3;

      const dist = Math.hypot(player.x - e.x, player.y - e.y);
      if (dist < e.radius + player.radius && now > player.invulnUntil) {
        damagePlayer(e.dmg);
        player.invulnUntil = now + 450;
        if (e.isBoss && e.ai && e.ai.dashState === 'dashing') {
          applyKnockback(e.x, e.y, 320);
        }
      }
    }
    enemies = enemies.filter((e) => !e.dead);
  }

  // ============ 보스 패턴 시스템 ============
  function createBossAI(bossKey) {
    switch (bossKey) {
      case 'mutantBear': return { summonTimer: 10 };
      case 'alpha': return { swingTimer: 10 };
      case 'omega': return { swingTimer: 10, zoneTimer: 15 };
      case 'gamma': return { zoneTimer: 10, laserTimer: 15 };
      case 'weakline': return { syringeTimer: 10, dashTimer: 15, fogTickTimer: 0.5, dashState: null };
      default: return {};
    }
  }

  function applyKnockback(fromX, fromY, strength) {
    const dx = player.x - fromX, dy = player.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    player.kx += (dx / d) * strength;
    player.ky += (dy / d) * strength;
  }

  function startTelegraph(e, type, duration) {
    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const dir = { x: dx / d, y: dy / d };
    const data = { dir, x: e.x, y: e.y };
    if (type === 'zone') {
      // 맵 위 랜덤 위치 (플레이어 주변)에 장판 설치
      const ang = rand(0, Math.PI * 2);
      const dist = rand(80, 420);
      data.x = clamp(player.x + Math.cos(ang) * dist, WORLD_MIN, WORLD_MAX);
      data.y = clamp(player.y + Math.sin(ang) * dist, WORLD_MIN, WORLD_MAX);
    }
    if (e.bossType === 'omega') data.color = '#ff8fd6';
    else if (e.bossType === 'gamma') data.color = '#ff5fd2';
    e.telegraph = { type, timer: duration, duration, executed: false, data };
  }

  function updateBossTelegraph(e, dt, now) {
    if (!e.telegraph) return;
    const t = e.telegraph;
    if (!t.executed) {
      t.timer -= dt;
      if (t.timer <= 0) {
        t.executed = true;
        t.timer = 0.15;
        executeBossAttack(e, t, now);
      }
    } else {
      t.timer -= dt;
      if (t.timer <= 0) e.telegraph = null;
    }
  }

  function executeBossAttack(e, t, now) {
    switch (t.type) {
      case 'semilaser':
        resolveSemicircleLaser(e, t.data.dir, now);
        if (e.bossType === 'omega') {
          // 오메가는 반원형 레이저를 총 3연발로 발사
          e.ai.pendingSemilaser = { remaining: 2, timer: 0.35, dir: { x: t.data.dir.x, y: t.data.dir.y } };
        }
        break;
      case 'zone': resolveZone(e, t); break;
      case 'laser': resolveLaser(e, t, now); break;
      case 'summon': resolveSummon(e, t); break;
      case 'syringe': resolveSyringe(e, t); break;
      case 'dash':
        e.ai.dashState = 'dashing';
        e.ai.dashDir = { x: t.data.dir.x, y: t.data.dir.y };
        e.ai.dashTravelTimer = 0.4;
        break;
    }
  }

  function spawnArcFlash(e, dir) {
    arcFlashes.push({ x: e.x, y: e.y, dir: { x: dir.x, y: dir.y }, timer: 0.25, maxTimer: 0.25 });
  }

  function resolveSemicircleLaser(e, dir, now) {
    const dx = player.x - e.x, dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const bandInner = 90, bandOuter = 150;
    spawnArcFlash(e, dir);
    if (dist >= bandInner && dist <= bandOuter) {
      const dot = (dx / dist) * dir.x + (dy / dist) * dir.y;
      if (dot > 0 && now > player.invulnUntil) {
        damagePlayer(Math.round(e.dmg * 1.15));
        applyKnockback(e.x, e.y, 300);
        player.invulnUntil = now + 450;
      }
    }
  }

  function resolveZone(e, t) {
    hazardZones.push({
      x: t.data.x, y: t.data.y,
      radius: 110,
      damage: 8,
      tickInterval: 0.5,
      tickTimer: 0,
      life: 4.0,
      color: t.data.color || '#ff5fd2',
    });
  }

  function resolveLaser(e, t, now) {
    const dir = t.data.dir;
    const dx = player.x - e.x, dy = player.y - e.y;
    const forward = dx * dir.x + dy * dir.y;
    const perp = Math.abs(dx * -dir.y + dy * dir.x);
    if (forward > 0 && forward <= 1000 && perp <= 24 && now > player.invulnUntil) {
      damagePlayer(Math.round(e.dmg * 1.2));
      player.invulnUntil = now + 450;
    }
  }

  function resolveSummon(e, t) {
    const tier = difficultyTier();
    const hpMult = 1 + tier * 0.12, dmgMult = 1 + tier * 0.08, speedMult = Math.min(1.5, 1 + tier * 0.02);
    const def = ENEMY_DEFS.mutantWolf;
    for (let i = 0; i < 5; i++) {
      const ang = (Math.PI * 2 * i) / 5 + rand(-0.25, 0.25);
      const x = clamp(t.data.x + Math.cos(ang) * 80, WORLD_MIN, WORLD_MAX);
      const y = clamp(t.data.y + Math.sin(ang) * 80, WORLD_MIN, WORLD_MAX);
      enemies.push({
        x, y,
        hp: def.hp * hpMult, maxHp: def.hp * hpMult,
        dmg: def.dmg * dmgMult,
        speed: def.speed * speedMult * 2, // 일반 늑대 대비 이동속도 2배
        radius: def.radius,
        color: def.color,
        xpValue: def.xp,
        type: 'mutantWolf',
        isBoss: false,
        hitFlash: 0,
        dead: false,
        lastOrbHitTime: 0,
      });
    }
  }

  function resolveSyringe(e, t) {
    const baseAngle = Math.atan2(t.data.dir.y, t.data.dir.x);
    const offsets = [-0.32, 0, 0.32];
    for (const off of offsets) {
      const ang = baseAngle + off;
      enemyProjectiles.push({
        x: e.x, y: e.y,
        vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 320,
        radius: 6, life: 2.5,
        color: '#8ee62c',
        dotDamage: 5, dotInterval: 1, dotTicks: 5,
        hit: false,
      });
    }
  }

  function updateBossAI(e, dt, now) {
    if (!e.ai) e.ai = createBossAI(e.bossType);

    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (!(e.ai.dashState === 'dashing')) {
      e.facing = { x: dx / d, y: dy / d };
    }

    let moveOverridden = !!e.telegraph;

    if (e.bossType === 'weakline') {
      if (e.ai.dashState === 'dashing') {
        moveOverridden = true;
        const dashSpeed = 620;
        e.x += e.ai.dashDir.x * dashSpeed * dt;
        e.y += e.ai.dashDir.y * dashSpeed * dt;
        e.x = clamp(e.x, WORLD_MIN, WORLD_MAX);
        e.y = clamp(e.y, WORLD_MIN, WORLD_MAX);
        e.ai.dashTravelTimer -= dt;
        if (e.ai.dashTravelTimer <= 0) {
          e.ai.dashState = 'recover';
          e.ai.dashRecoverTimer = 1.0;
        }
      } else if (e.ai.dashState === 'recover') {
        moveOverridden = true;
        e.ai.dashRecoverTimer -= dt;
        if (e.ai.dashRecoverTimer <= 0) e.ai.dashState = null;
      }

      // 지속 안개: 근처에 있으면 주기적으로 틱 데미지
      e.ai.fogTickTimer -= dt;
      if (e.ai.fogTickTimer <= 0) {
        e.ai.fogTickTimer = 0.5;
        const dd = Math.hypot(player.x - e.x, player.y - e.y);
        if (dd <= 200) damagePlayer(4);
      }
    }

    // 오메가 반원형 레이저 3연발 - 이어지는 2회 처리
    if (e.ai.pendingSemilaser) {
      e.ai.pendingSemilaser.timer -= dt;
      if (e.ai.pendingSemilaser.timer <= 0) {
        resolveSemicircleLaser(e, e.ai.pendingSemilaser.dir, now);
        e.ai.pendingSemilaser.remaining -= 1;
        e.ai.pendingSemilaser.timer = 0.35;
        if (e.ai.pendingSemilaser.remaining <= 0) e.ai.pendingSemilaser = null;
      }
    }

    if (!moveOverridden) {
      const spd = effectiveSpeed(e, now);
      e.x += (dx / d) * spd * dt;
      e.y += (dy / d) * spd * dt;
      e.x = clamp(e.x, WORLD_MIN, WORLD_MAX);
      e.y = clamp(e.y, WORLD_MIN, WORLD_MAX);
    }

    updateBossTelegraph(e, dt, now);

    if (!e.telegraph) {
      const busy = (e.bossType === 'weakline' && e.ai.dashState) || !!e.ai.pendingSemilaser;
      if (!busy) {
        switch (e.bossType) {
          case 'mutantBear':
            e.ai.summonTimer -= dt;
            if (e.ai.summonTimer <= 0) { e.ai.summonTimer = 10; startTelegraph(e, 'summon', 0.5); }
            break;
          case 'alpha':
            e.ai.swingTimer -= dt;
            if (e.ai.swingTimer <= 0) { e.ai.swingTimer = 10; startTelegraph(e, 'semilaser', 0.5); }
            break;
          case 'omega':
            e.ai.swingTimer -= dt;
            if (e.ai.swingTimer <= 0) { e.ai.swingTimer = 10; startTelegraph(e, 'semilaser', 0.5); }
            if (!e.telegraph) {
              e.ai.zoneTimer -= dt;
              if (e.ai.zoneTimer <= 0) { e.ai.zoneTimer = 15; startTelegraph(e, 'zone', 0.4); }
            }
            break;
          case 'gamma':
            e.ai.zoneTimer -= dt;
            if (e.ai.zoneTimer <= 0) { e.ai.zoneTimer = 10; startTelegraph(e, 'zone', 0.4); }
            if (!e.telegraph) {
              e.ai.laserTimer -= dt;
              if (e.ai.laserTimer <= 0) { e.ai.laserTimer = 15; startTelegraph(e, 'laser', 0.6); }
            }
            break;
          case 'weakline':
            e.ai.syringeTimer -= dt;
            if (e.ai.syringeTimer <= 0) { e.ai.syringeTimer = 10; startTelegraph(e, 'syringe', 0.4); }
            if (!e.telegraph) {
              e.ai.dashTimer -= dt;
              if (e.ai.dashTimer <= 0) { e.ai.dashTimer = 15; startTelegraph(e, 'dash', 0.5); }
            }
            break;
        }
      }
    }
  }

  function updatePlayerEffects(dt) {
    if (Math.abs(player.kx) > 1 || Math.abs(player.ky) > 1) {
      player.x += player.kx * dt;
      player.y += player.ky * dt;
      player.x = clamp(player.x, WORLD_MIN + player.radius, WORLD_MAX - player.radius);
      player.y = clamp(player.y, WORLD_MIN + player.radius, WORLD_MAX - player.radius);
      const decay = Math.max(0, 1 - dt * 6);
      player.kx *= decay;
      player.ky *= decay;
    } else {
      player.kx = 0; player.ky = 0;
    }

    for (const dot of player.dots) {
      dot.tickTimer -= dt;
      if (dot.tickTimer <= 0) {
        dot.tickTimer += dot.tickInterval;
        dot.ticksLeft -= 1;
        damagePlayer(dot.damage);
      }
    }
    player.dots = player.dots.filter((d) => d.ticksLeft > 0);
  }

  function updateHazardZones(dt) {
    const now = performance.now();
    for (const z of hazardZones) {
      z.life -= dt;
      if (z.target === 'enemies') {
        z.tickTimer -= dt;
        if (z.tickTimer <= 0) {
          z.tickTimer += z.tickInterval;
          for (const e of enemies) {
            if (e.dead) continue;
            const d = Math.hypot(e.x - z.x, e.y - z.y);
            if (d <= z.radius) {
              if (z.bleedZone) {
                applyBleed(e, 0.05, 1, 3);
              } else if (z.slowPct) {
                applySlow(e, z.slowPct, z.tickInterval * 1.6, now);
              } else {
                const dmg = z.percentCurrentHp ? e.hp * z.percentCurrentHp : z.damage;
                damageEnemy(e, dmg);
              }
            }
          }
        }
      } else {
        const d = Math.hypot(player.x - z.x, player.y - z.y);
        if (d <= z.radius) {
          z.tickTimer -= dt;
          if (z.tickTimer <= 0) {
            z.tickTimer += z.tickInterval;
            damagePlayer(z.damage);
          }
        }
      }
    }
    hazardZones = hazardZones.filter((z) => z.life > 0);
  }

  function updateEnemyProjectiles(dt) {
    for (const p of enemyProjectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (!p.hit) {
        const d = Math.hypot(player.x - p.x, player.y - p.y);
        if (d < player.radius + p.radius) {
          p.hit = true;
          player.dots.push({ damage: p.dotDamage, tickInterval: p.dotInterval, tickTimer: p.dotInterval, ticksLeft: p.dotTicks });
          spawnHitBurst(p.x, p.y, p.color);
        }
      }
    }
    enemyProjectiles = enemyProjectiles.filter((p) =>
      p.life > 0 && !p.hit &&
      p.x > WORLD_MIN - 300 && p.x < WORLD_MAX + 300 &&
      p.y > WORLD_MIN - 300 && p.y < WORLD_MAX + 300
    );
  }

  function damageEnemy(e, amount) {
    if (e.dead) return;
    if (player.damageMult && player.damageMult !== 1) amount *= player.damageMult;
    e.hp -= amount;
    e.hitFlash = 1;
    applyJackieLifesteal(amount);
    if (player.lifestealPct > 0) {
      player.hp = Math.min(player.maxHp, player.hp + amount * player.lifestealPct);
    }
    if (e.hp <= 0) {
      e.dead = true;
      kills += 1;
      spawnDeathParticles(e);
      xpGems.push({
        x: e.x, y: e.y, value: e.xpValue,
        radius: e.isBoss ? 8 : 5,
        isBoss: !!e.isBoss,
      });

      if (e.isBoss) {
        collectAllGems();
      }

      if (Math.random() < CONSUMABLE_DROP_CHANCE) {
        spawnItemDrop(e.x, e.y, pick(['pizza', 'lightning', 'ruin']));
      }

      handleJackieBloodFestivalKill();

      if (e.isBoss && e.bossMilestoneLevel === FINAL_BOSS_LEVEL) {
        triggerVictory();
      }
    }
  }

  // ---- 재키: 피의 축제(패시브) ----
  function handleJackieBloodFestivalKill() {
    if (selectedCharacter !== 'jackie' || !player.uniqueSkills.s2) return;
    player.jackieKillStreak = (player.jackieKillStreak || 0) + 1;
    if (player.jackieKillStreak >= 50) {
      player.jackieKillStreak = 0;
      player.bloodFrenzyUntil = performance.now() + 5000;
    }
  }

  function isJackieFrenzyActive(now) {
    return selectedCharacter === 'jackie' && player.bloodFrenzyUntil && now < player.bloodFrenzyUntil;
  }

  function applyJackieLifesteal(amount) {
    if (selectedCharacter !== 'jackie') return;
    const s2 = player.uniqueSkills.s2;
    if (!s2) return;
    const now = performance.now();
    let pct = 0;
    if (isJackieFrenzyActive(now)) {
      const charDef = CHARACTERS.jackie;
      pct += charDef.skills.s2.levels[s2.level - 1].lifesteal;
    }
    // 습격자의 숨결 5레벨 피의 장판 위에 있으면 흡혈 +3%
    const s3 = player.uniqueSkills.s3;
    if (s3 && s3.level >= 5) {
      for (const z of hazardZones) {
        if (z.jackieBloodZone) {
          const d = Math.hypot(player.x - z.x, player.y - z.y);
          if (d <= z.radius) { pct += 0.03; break; }
        }
      }
    }
    if (pct > 0) {
      player.hp = Math.min(player.maxHp, player.hp + amount * pct);
    }
  }

  function collectAllGems() {
    for (const g of xpGems) {
      gainXp(g.value);
    }
    xpGems = [];
  }

  // ============ 소비성 아이템 ============

  function applyConsumableItem(key) {
    if (key === 'pizza') {
      const healAmount = Math.round(player.maxHp * 0.5);
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
      flashScreen('rgba(255, 184, 77, 0.35)', 300);
    } else if (key === 'lightning') {
      const buff = player.itemBuffs.lightning;
      const wasActive = buff.timeLeft > 0;
      buff.timeLeft += 30;
      if (!wasActive) buff.tickTimer = 3;
    } else if (key === 'ruin') {
      const buff = player.itemBuffs.ruin;
      const wasActive = buff.timeLeft > 0;
      buff.timeLeft += 10;
      if (!wasActive) buff.tickTimer = 1;
    }
    itemAnnounceText = `아이템 획득: ${CONSUMABLE_ITEMS[key].name}`;
    itemAnnounceTimer = 2.4;
  }

  function spawnItemDrop(x, y, key) {
    itemDrops.push({ x, y, key, radius: 14, bob: rand(0, Math.PI * 2) });
  }

  function updateItemDrops(dt) {
    for (const d of itemDrops) {
      d.bob += dt * 3;
      const dist = Math.hypot(player.x - d.x, player.y - d.y);
      if (dist < player.radius + d.radius) {
        d.collected = true;
        applyConsumableItem(d.key);
      }
    }
    itemDrops = itemDrops.filter((d) => !d.collected);
  }

  function strikeRandomLightning() {
    const ang = rand(0, Math.PI * 2);
    const dist = rand(0, 420);
    const x = clamp(player.x + Math.cos(ang) * dist, WORLD_MIN, WORLD_MAX);
    const y = clamp(player.y + Math.sin(ang) * dist, WORLD_MIN, WORLD_MAX);
    const strikeRadius = 90;

    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= strikeRadius) damageEnemy(e, e.hp + 99999);
    }

    lightningStrikes.push({ x, y, radius: strikeRadius, timer: 0.35 });
  }

  function applyRuinDamageToAllEnemies() {
    for (const e of enemies) {
      if (e.dead) continue;
      damageEnemy(e, e.maxHp * 0.05);
    }
  }

  function updateItemBuffs(dt) {
    const lightning = player.itemBuffs.lightning;
    if (lightning.timeLeft > 0) {
      lightning.timeLeft -= dt;
      lightning.tickTimer -= dt;
      if (lightning.tickTimer <= 0) {
        lightning.tickTimer += 3;
        strikeRandomLightning();
      }
      if (lightning.timeLeft < 0) lightning.timeLeft = 0;
    }

    const ruin = player.itemBuffs.ruin;
    if (ruin.timeLeft > 0) {
      ruin.timeLeft -= dt;
      ruin.tickTimer -= dt;
      if (ruin.tickTimer <= 0) {
        ruin.tickTimer += 1;
        applyRuinDamageToAllEnemies();
      }
      if (ruin.timeLeft < 0) ruin.timeLeft = 0;
    }

    for (const s of lightningStrikes) s.timer -= dt;
    lightningStrikes = lightningStrikes.filter((s) => s.timer > 0);

    for (const f of arcFlashes) f.timer -= dt;
    arcFlashes = arcFlashes.filter((f) => f.timer > 0);

    for (const p of skillPulses) {
      const growthMult = p.style === 'ring' ? 1.7 : p.style === 'converge' ? 0.6 : 1.0;
      const fadeMult = p.style === 'converge' ? 1.3 : p.style === 'ring' ? 2.6 : 2.2;
      p.radius += ((p.maxRadius - p.radius) * 0.2 + 60 * dt) * growthMult;
      p.alpha -= dt * fadeMult;
    }
    skillPulses = skillPulses.filter((p) => p.alpha > 0);
  }

  function damagePlayer(amount) {
    if (player.fullInvulnUntil && performance.now() < player.fullInvulnUntil) return;
    player.hp -= amount;
    shakeTimer = 0.25;
    shakeMag = 8;
    flashScreen('rgba(255,60,90,0.35)', 220);
    if (player.hp <= 0) {
      player.hp = 0;
      triggerGameOver();
    }
  }

  // ============ XP 젬 ============
  function updateGems(dt) {
    for (const g of xpGems) {
      const dx = player.x - g.x, dy = player.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < player.magnetRadius) {
        const pull = clamp(dt * 9, 0, 1);
        g.x += dx * pull;
        g.y += dy * pull;
      }
      if (d < player.radius + 14) {
        g.collected = true;
        gainXp(g.value);
      }
    }
    xpGems = xpGems.filter((g) => !g.collected);
  }

  function xpGainMultiplier() {
    // 10레벨마다 경험치 획득량 +5%, 요명월 스탯 보너스 추가
    return 1 + Math.floor(player.level / 10) * 0.05 + (player.xpBonusPct || 0);
  }

  function gainXp(amount) {
    player.xp += amount * xpGainMultiplier();
    while (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level += 1;
      player.xpToNext = calcXpToNext(player.level);
      grantAutoUnlockedSkills();
      if (player.level % 10 === 0 && !bossLevelsSpawned.has(player.level)) {
        bossLevelsSpawned.add(player.level);
        spawnBoss(player.level);
      }
      triggerLevelUp();
      break; // 한 번에 한 레벨업 모달만 처리, 남은 xp는 다음 프레임에 재검사
    }
  }

  // ============ 파티클 ============
  function spawnDeathParticles(e) {
    for (let i = 0; i < 6; i++) {
      const ang = rand(0, Math.PI * 2);
      const spd = rand(40, 140);
      particles.push({
        x: e.x, y: e.y,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        life: 0.4, maxLife: 0.4,
        color: e.color, size: rand(2, 4),
      });
    }
  }

  function spawnHitBurst(x, y, color) {
    for (let i = 0; i < 4; i++) {
      const ang = rand(0, Math.PI * 2);
      const spd = rand(30, 90);
      particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.3, maxLife: 0.3, color, size: rand(2, 3) });
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.9; p.vy *= 0.9;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
  }

  // ============ 화면 플래시 ============
  const flashEl = document.getElementById('flash');
  let flashFade = null;
  function flashScreen(color, ms) {
    flashEl.style.transition = 'none';
    flashEl.style.background = color;
    flashEl.style.opacity = '1';
    requestAnimationFrame(() => {
      flashEl.style.transition = `opacity ${ms}ms ease`;
      flashEl.style.opacity = '0';
    });
  }

  // ============ 레벨업 UI ============
  const levelupOverlay = document.getElementById('levelupOverlay');
  const cardRow = document.getElementById('cardRow');
  const rerollBtn = document.getElementById('rerollBtn');
  const rerollCountEl = document.getElementById('rerollCount');

  function buildLevelUpOptions() {
    const weaponPool = [];
    for (const wid in WEAPON_DEFS) {
      const def = WEAPON_DEFS[wid];
      const owned = player.weapons[wid];
      if (!owned) {
        weaponPool.push({ kind: 'weapon_new', weaponId: wid, tag: '신규 무기', title: def.name, desc: def.desc });
      } else if (owned.level < def.levels.length) {
        weaponPool.push({ kind: 'weapon_up', weaponId: wid, tag: `강화 Lv.${owned.level + 1}`, title: def.name, desc: def.desc });
      }
    }

    const skillPool = [];
    const charDef = CHARACTERS[selectedCharacter];
    if (charDef && charDef.skills) {
      for (const skillKey in charDef.skills) {
        const def = charDef.skills[skillKey];
        const owned = player.uniqueSkills[skillKey];
        // 신규 고유 스킬은 1/3/5레벨 도달 시 자동 지급되므로 카드로 노출하지 않음
        if (owned && owned.level < def.levels.length) {
          skillPool.push({ kind: 'skill_up', skillKey, tag: `고유 강화 Lv.${owned.level + 1}`, title: def.name, desc: def.levels[owned.level].desc });
        }
      }
    }

    const statPool = [];
    for (const sid in STAT_DEFS) {
      const s = STAT_DEFS[sid];
      const picks = player.statPicks[sid] || 0;
      if (picks < 5) {
        statPool.push({ kind: 'stat', statId: sid, tag: `능력치 Lv.${picks + 1}/5`, title: s.title, desc: s.desc });
      }
    }

    shuffle(statPool);
    shuffle(skillPool);
    shuffle(weaponPool);

    // 능력치 / 고유 스킬 / 공용 스킬에서 최소 1개씩 우선 배정
    const chosen = [];
    for (const pool of [statPool, skillPool, weaponPool]) {
      if (pool.length > 0) chosen.push(pool.shift());
    }

    // 남은 자리는 (고유스킬 전부 만렙 등으로 비어있는 경우) 나머지 풀에서 랜덤 보충
    const leftover = [...statPool, ...skillPool, ...weaponPool];
    shuffle(leftover);
    while (chosen.length < 3 && leftover.length > 0) {
      chosen.push(leftover.shift());
    }

    shuffle(chosen);
    return chosen.slice(0, 3);
  }

  function renderLevelUpCards() {
    const options = buildLevelUpOptions();
    cardRow.innerHTML = '';
    options.forEach((opt) => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `<div class="tag">${opt.tag}</div><div class="title">${opt.title}</div><div class="desc">${opt.desc}</div>`;
      card.addEventListener('click', () => applyOption(opt));
      cardRow.appendChild(card);
    });
    rerollCountEl.textContent = player.rerollsLeft;
    rerollBtn.disabled = player.rerollsLeft <= 0;
  }

  function triggerLevelUp() {
    state = 'levelup';
    renderLevelUpCards();
    levelupOverlay.classList.remove('hidden');
  }

  function rerollLevelUpCards() {
    if (player.rerollsLeft <= 0) return;
    player.rerollsLeft -= 1;
    renderLevelUpCards();
  }

  function applyOption(opt) {
    if (opt.kind === 'weapon_new') {
      player.weapons[opt.weaponId] = { level: 1, cooldownTimer: 0, angle: 0 };
    } else if (opt.kind === 'weapon_up') {
      player.weapons[opt.weaponId].level += 1;
    } else if (opt.kind === 'skill_new') {
      player.uniqueSkills[opt.skillKey] = { level: 1, cooldownTimer: 0 };
    } else if (opt.kind === 'skill_up') {
      player.uniqueSkills[opt.skillKey].level += 1;
    } else if (opt.kind === 'stat') {
      player.statPicks[opt.statId] = (player.statPicks[opt.statId] || 0) + 1;
      STAT_DEFS[opt.statId].apply(player);
    }
    levelupOverlay.classList.add('hidden');
    state = 'playing';
    flashScreen('rgba(255,255,255,0.5)', 380);
    // 남아있는 초과 xp로 인한 추가 레벨업 체크
    if (player.xp >= player.xpToNext) gainXp(0);
  }

  // ============ HUD 업데이트 ============
  const killCountEl = document.getElementById('killCount');
  const timerEl = document.getElementById('timer');

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  const WEAPON_SHAPE_CLASS = { missile: 'shape-missile', protocol: 'shape-protocol', truthblade: 'shape-truthblade', meteor: 'shape-meteor', weaken: 'shape-weaken' };

  function updateHUD() {
    killCountEl.textContent = '처치: ' + kills;
    timerEl.textContent = formatTime(elapsed);

    populateStatusContent();
  }

  // ============ 배경 렌더 ============
  function hashCell(cx, cy) {
    const h = Math.sin(cx * 127.1 + cy * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }

  function drawBackground(camX, camY) {
    ctx.fillStyle = '#0d2117';
    ctx.fillRect(0, 0, W, H);

    const tile = 80;
    const startCX = Math.floor((camX - W / 2) / tile) - 1;
    const endCX = Math.floor((camX + W / 2) / tile) + 1;
    const startCY = Math.floor((camY - H / 2) / tile) - 1;
    const endCY = Math.floor((camY + H / 2) / tile) + 1;

    ctx.strokeStyle = 'rgba(120, 200, 150, 0.10)';
    ctx.lineWidth = 1;
    for (let cx = startCX; cx <= endCX; cx++) {
      const sx = cx * tile - camX + W / 2;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, H);
      ctx.stroke();
    }
    for (let cy = startCY; cy <= endCY; cy++) {
      const sy = cy * tile - camY + H / 2;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(W, sy);
      ctx.stroke();
    }

    for (let cx = startCX; cx <= endCX; cx++) {
      for (let cy = startCY; cy <= endCY; cy++) {
        const h = hashCell(cx, cy);
        const wx = cx * tile + tile / 2;
        const wy = cy * tile + tile / 2;
        const sx = wx - camX + W / 2;
        const sy = wy - camY + H / 2;

        if (h > 0.93) {
          // 수풀/덤불
          const r = 14 + h * 12;
          ctx.fillStyle = 'rgba(30, 70, 45, 0.55)';
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(90, 180, 110, 0.35)';
          ctx.beginPath();
          ctx.arc(sx - r * 0.25, sy - r * 0.25, r * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (h > 0.86 && h <= 0.90) {
          // 모래/공터
          ctx.fillStyle = 'rgba(200, 180, 120, 0.14)';
          ctx.beginPath();
          ctx.arc(sx, sy, 20 + h * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 맵 테두리 (월드 경계 표시)
    const borderLeft = WORLD_MIN - camX + W / 2;
    const borderRight = WORLD_MAX - camX + W / 2;
    const borderTop = WORLD_MIN - camY + H / 2;
    const borderBottom = WORLD_MAX - camY + H / 2;

    ctx.save();
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 10;
    ctx.shadowColor = 'rgba(255, 77, 109, 0.55)';
    ctx.shadowBlur = 18;
    ctx.strokeRect(borderLeft, borderTop, borderRight - borderLeft, borderBottom - borderTop);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 214, 102, 0.65)';
    ctx.lineWidth = 2;
    ctx.strokeRect(borderLeft + 6, borderTop + 6, borderRight - borderLeft - 12, borderBottom - borderTop - 12);
    ctx.restore();
  }

  // ============ 메인 렌더 ============
  function render() {
    if (!player) {
      ctx.fillStyle = '#0d2117';
      ctx.fillRect(0, 0, W, H);
      return;
    }

    const now = performance.now();
    let camX = player.x, camY = player.y;
    let offX = 0, offY = 0;
    if (shakeTimer > 0) {
      offX = (Math.random() * 2 - 1) * shakeMag * (shakeTimer / 0.25);
      offY = (Math.random() * 2 - 1) * shakeMag * (shakeTimer / 0.25);
    }

    drawBackground(camX - offX, camY - offY);

    const toScreenX = (wx) => wx - camX + W / 2 + offX;
    const toScreenY = (wy) => wy - camY + H / 2 + offY;

    // xp gems
    for (const g of xpGems) {
      const sx = toScreenX(g.x), sy = toScreenY(g.y);
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      ctx.fillStyle = g.isBoss ? '#ff3b3b' : '#e4e2f5';
      ctx.beginPath();
      ctx.arc(sx, sy, g.radius, 0, Math.PI * 2);
      ctx.fill();
      if (g.isBoss) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 필드 드랍 아이템 (소비성 아이템)
    for (const d of itemDrops) {
      const sx = toScreenX(d.x), sy = toScreenY(d.y);
      if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
      const bobY = Math.sin(d.bob) * 4;
      const glow = 0.5 + 0.3 * Math.sin(d.bob * 1.5);
      const color = CONSUMABLE_ITEMS[d.key].color;

      ctx.save();
      ctx.globalAlpha = glow * 0.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy + bobY, d.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.translate(sx, sy + bobY);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-d.radius * 0.7, -d.radius * 0.7, d.radius * 1.4, d.radius * 1.4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-d.radius * 0.7, -d.radius * 0.7, d.radius * 1.4, d.radius * 1.4);
      ctx.restore();
    }

    // 장판(hazard zone)
    for (const z of hazardZones) {
      const sx = toScreenX(z.x), sy = toScreenY(z.y);
      const lifePct = clamp(z.life / 4.0, 0, 1);
      ctx.globalAlpha = 0.28 * clamp(lifePct * 3, 0, 1);
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(sx, sy, z.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, z.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 번개 낙뢰 이펙트 (번개의 룬 아이템 / 에이든 낙뢰 스킬 공용)
    for (const s of lightningStrikes) {
      const sx = toScreenX(s.x), sy = toScreenY(s.y);
      const t = clamp(s.timer / 0.35, 0, 1);
      const boltColor = s.color || '#f4d35e';
      ctx.save();
      ctx.globalAlpha = t;
      ctx.strokeStyle = boltColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      let bx = sx, by = sy - 260;
      ctx.moveTo(bx, by);
      for (let i = 0; i < 5; i++) {
        bx += rand(-18, 18);
        by += 52;
        ctx.lineTo(bx, by);
      }
      ctx.stroke();
      ctx.fillStyle = boltColor;
      ctx.globalAlpha = t * 0.4;
      ctx.beginPath();
      ctx.arc(sx, sy, s.radius * (1.3 - t * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 반원 레이저 반복타 / 부채꼴 공격 이펙트
    for (const f of arcFlashes) {
      const sx = toScreenX(f.x), sy = toScreenY(f.y);
      const ang = Math.atan2(f.dir.y, f.dir.x);
      const a = clamp(f.timer / f.maxTimer, 0, 1);
      ctx.save();
      if (f.coneRad) {
        // 재키 힘줄 절단: 채워진 부채꼴
        ctx.globalAlpha = a * 0.7;
        ctx.fillStyle = f.color || '#ffffff';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, f.range || 140, ang - f.coneRad / 2, ang + f.coneRad / 2);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        ctx.strokeStyle = f.color || '#ffffff';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(sx, sy, 120, ang - Math.PI / 2, ang + Math.PI / 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 고유 스킬 폭발/펄스 이펙트 (스타일별로 다르게 표현)
    for (const p of skillPulses) {
      const sx = toScreenX(p.x), sy = toScreenY(p.y);
      const a = Math.max(0, p.alpha);
      ctx.save();

      if (p.style === 'ring') {
        // 블라스트 웨이브: 밀어내는 충격파 - 속이 빈 링 + 방사형 스포크
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
        ctx.stroke();
        const spokes = 8;
        ctx.lineWidth = 3;
        for (let i = 0; i < spokes; i++) {
          const ang = (Math.PI * 2 * i) / spokes;
          const innerR = p.radius * 0.5;
          const outerR = p.radius * 1.08;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(ang) * innerR, sy + Math.sin(ang) * innerR);
          ctx.lineTo(sx + Math.cos(ang) * outerR, sy + Math.sin(ang) * outerR);
          ctx.stroke();
        }
      } else if (p.style === 'converge') {
        // 자력 융합: 서로 다른 방향으로 움직이는 이중 링 (수렴/발산 느낌)
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = a * 0.7;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(2, p.maxRadius - p.radius), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 플라즈마 폭탄: 꽉 찬 폭발
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // enemies
    for (const e of enemies) {
      const sx = toScreenX(e.x), sy = toScreenY(e.y);
      if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) continue;

      if (e.isBoss) {
        // 위클라인 박사: 지속 안개 오라
        if (e.bossType === 'weakline') {
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = '#7cfc6e';
          ctx.beginPath();
          ctx.arc(sx, sy, 200, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        const drew = drawBossSprite(sx, sy, e.radius, e.bossType, e.hitFlash);
        if (!drew) {
          ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
          ctx.beginPath();
          ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, e.radius + 7, 0, Math.PI * 2);
        ctx.stroke();

        drawBossTelegraph(e, sx, sy, toScreenX, toScreenY);
      } else {
        const drew = drawPixelEnemy(sx, sy, e.radius, e.type, e.hitFlash);
        if (!drew) {
          ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
          ctx.beginPath();
          ctx.arc(sx, sy, e.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // hp bar
      const barW = e.radius * 2;
      const pct = clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx - barW / 2, sy - e.radius - 10, barW, 4);
      ctx.fillStyle = pct > 0.4 ? '#4de8d0' : '#ff4d6d';
      ctx.fillRect(sx - barW / 2, sy - e.radius - 10, barW * pct, 4);
    }

    // projectiles
    for (const p of projectiles) {
      const sx = toScreenX(p.x), sy = toScreenY(p.y);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 적 투사체 (위클라인 박사의 주사)
    for (const p of enemyProjectiles) {
      const sx = toScreenX(p.x), sy = toScreenY(p.y);
      const ang = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.fillStyle = p.color;
      ctx.fillRect(-9, -2, 18, 4);
      ctx.beginPath();
      ctx.arc(9, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // particles
    for (const pt of particles) {
      const sx = toScreenX(pt.x), sy = toScreenY(pt.y);
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(sx, sy, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // player
    const px = toScreenX(player.x), py = toScreenY(player.y);
    const invuln = now < player.invulnUntil;
    ctx.globalAlpha = invuln ? (0.5 + 0.5 * Math.sin(now / 40)) : 1;

    const drewPlayer = drawPlayerSprite(px, py, player.radius, selectedCharacter, 0);
    if (!drewPlayer) {
      ctx.fillStyle = '#4de8d0';
      ctx.beginPath();
      ctx.arc(px, py, player.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const fAng = Math.atan2(player.dir.y, player.dir.x);
    const fx = px + Math.cos(fAng) * (player.radius + 8);
    const fy = py + Math.sin(fAng) * (player.radius + 8);
    ctx.fillStyle = CHARACTERS[selectedCharacter] ? CHARACTERS[selectedCharacter].color : '#4de8d0';
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(fAng + 2.5) * 7, fy + Math.sin(fAng + 2.5) * 7);
    ctx.lineTo(fx + Math.cos(fAng - 2.5) * 7, fy + Math.sin(fAng - 2.5) * 7);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    if (player.dots.length > 0) {
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(now / 90);
      ctx.strokeStyle = '#8ee62c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, player.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 보스 등장 배너
    if (bossAnnounceTimer > 0 && bossAnnounceText) {
      ctx.save();
      ctx.globalAlpha = clamp(Math.min(bossAnnounceTimer, 2.6 - bossAnnounceTimer) / 0.4, 0, 1);
      ctx.font = 'bold 26px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd166';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText(bossAnnounceText, W / 2, H * 0.28);
      ctx.restore();
    }

    // 아이템 획득 토스트
    if (itemAnnounceTimer > 0 && itemAnnounceText) {
      ctx.save();
      ctx.globalAlpha = clamp(Math.min(itemAnnounceTimer, 2.4 - itemAnnounceTimer) / 0.3, 0, 1);
      ctx.font = 'bold 18px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(itemAnnounceText, W / 2, H * 0.36);
      ctx.restore();
    }
  }

  // ============ 업데이트 루프 ============
  function update(dt) {
    const now = performance.now();
    elapsed += dt;

    updatePlayer(dt);
    updatePlayerEffects(dt);
    updateWeapons(dt, now);
    updateUniqueSkills(dt, now);
    updateBasicAttack(dt);
    updateProjectiles(dt);
    updateEnemies(dt, now);
    updateEnemyStatuses(dt);
    updateEnemyProjectiles(dt);
    updateHazardZones(dt);
    updateItemBuffs(dt);
    updateItemDrops(dt);
    updateGems(dt);
    updateParticles(dt);
    updateSpawning(dt);

    if (shakeTimer > 0) shakeTimer -= dt;
    if (bossAnnounceTimer > 0) bossAnnounceTimer -= dt;
    if (itemAnnounceTimer > 0) itemAnnounceTimer -= dt;

    updateHUD();

    if (player.hp <= 0) {
      triggerGameOver();
    }
  }

  // ============ 종료 처리 ============
  const gameoverOverlay = document.getElementById('gameoverOverlay');
  const victoryOverlay = document.getElementById('victoryOverlay');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const statusPanel = document.getElementById('statusPanel');
  const statusContentEl = document.getElementById('statusContent');
  const statusCollapseBtn = document.getElementById('statusCollapseBtn');

  function triggerGameOver() {
    if (state === 'gameover') return;
    state = 'gameover';
    document.getElementById('overTime').textContent = formatTime(elapsed);
    document.getElementById('overLevel').textContent = player.level;
    document.getElementById('overKills').textContent = kills;
    gameoverOverlay.classList.remove('hidden');
  }

  function triggerVictory() {
    if (state === 'victory') return;
    state = 'victory';
    document.getElementById('winTime').textContent = formatTime(elapsed);
    document.getElementById('winLevel').textContent = player.level;
    document.getElementById('winKills').textContent = kills;
    victoryOverlay.classList.remove('hidden');
  }

  // ============ 메인 루프 ============
  let lastTs = 0;
  function loop(ts) {
    const dt = Math.min((ts - lastTs) / 1000 || 0, 0.05);
    lastTs = ts;

    if (state === 'playing') {
      update(dt);
    }
    render();

    requestAnimationFrame(loop);
  }

  // ============ 캐릭터 선택 ============
  const charSelectOverlay = document.getElementById('charSelectOverlay');
  const charGrid = document.getElementById('charGrid');
  const skillPreview = document.getElementById('skillPreview');
  const charConfirmBtn = document.getElementById('charConfirmBtn');
  let pendingCharacter = null;

  function buildCharGrid() {
    charGrid.innerHTML = '';
    for (const key in CHARACTERS) {
      const c = CHARACTERS[key];
      const card = document.createElement('div');
      card.className = 'char-card' + (c.playable ? '' : ' disabled');

      const hasSprite = !!PLAYER_SPRITES[key];
      const avatarInner = hasSprite
        ? `<canvas width="56" height="56" style="image-rendering:pixelated;"></canvas>`
        : c.name[0];

      card.innerHTML = `
        <div class="char-avatar" style="background:${c.color}">${avatarInner}</div>
        <div class="char-name">${c.name}</div>
        <div class="char-tag">${c.tagline}</div>
      `;

      if (hasSprite) {
        const canvasEl = card.querySelector('canvas');
        renderAvatarSprite(canvasEl, PLAYER_SPRITES[key]);
      }

      if (c.playable) {
        card.addEventListener('click', () => {
          pendingCharacter = key;
          document.querySelectorAll('.char-card').forEach((el) => el.classList.remove('selected'));
          card.classList.add('selected');
          charConfirmBtn.disabled = false;
          renderSkillPreview(key);
        });
      }
      charGrid.appendChild(card);
    }
  }

  function renderSkillPreview(key) {
    const c = CHARACTERS[key];
    if (!c || !c.skills) {
      skillPreview.classList.add('hidden');
      return;
    }
    let html = `<div class="sp-name">${c.name}의 고유 스킬</div>`;
    for (const skillKey in c.skills) {
      const s = c.skills[skillKey];
      html += `<div class="sp-skill">
        <div class="sp-slot" style="background:${c.color}">${skillKey.toUpperCase()}</div>
        <div class="sp-text">
          <span class="sp-title">${s.name}</span><span class="sp-unlock">Lv.${s.unlockLevel} 해금</span>
          <div class="sp-desc">${s.desc}</div>
        </div>
      </div>`;
    }
    skillPreview.innerHTML = html;
    skillPreview.classList.remove('hidden');
  }

  charConfirmBtn.addEventListener('click', () => {
    if (!pendingCharacter) return;
    selectedCharacter = pendingCharacter;
    charSelectOverlay.classList.add('hidden');
    document.getElementById('startOverlay').classList.remove('hidden');
  });

  buildCharGrid();

  // ============ 버튼 ============
  document.getElementById('startBtn').addEventListener('click', () => {
    document.getElementById('startOverlay').classList.add('hidden');
    initGame();
    state = 'playing';
    statusPanel.classList.remove('hidden');
    updateHUD();
  });

  document.getElementById('retryBtn').addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    initGame();
    state = 'playing';
    statusPanel.classList.remove('hidden');
    updateHUD();
  });

  document.getElementById('victoryRetryBtn').addEventListener('click', () => {
    victoryOverlay.classList.add('hidden');
    initGame();
    state = 'playing';
    statusPanel.classList.remove('hidden');
    updateHUD();
  });

  document.getElementById('resumeBtn').addEventListener('click', () => {
    togglePause();
  });

  document.getElementById('restartFromPauseBtn').addEventListener('click', () => {
    pauseOverlay.classList.add('hidden');
    statusPanel.classList.add('hidden');
    state = 'start';
    pendingCharacter = null;
    charConfirmBtn.disabled = true;
    document.querySelectorAll('.char-card').forEach((el) => el.classList.remove('selected'));
    skillPreview.classList.add('hidden');
    charSelectOverlay.classList.remove('hidden');
  });

  document.getElementById('pauseBtn').addEventListener('click', () => {
    togglePause();
  });

  document.getElementById('statusBtn').addEventListener('click', () => {
    toggleStatus();
  });

  statusCollapseBtn.addEventListener('click', () => {
    toggleStatus();
  });

  rerollBtn.addEventListener('click', () => {
    rerollLevelUpCards();
  });

  requestAnimationFrame(loop);



})();
