import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

export type AppCategory = 'Games' | 'Tools' | 'Media' | 'Sensors' | 'Clock';

export interface AppletRecord {
  id: string;
  title: string;
  slug: string;
  version: string;
  category: AppCategory;
  author: string;
  description: string;
  tags: string[];
  status: 'approved' | 'pending_review' | 'rejected';
  iconType: string;
  cppHeader: string;
  cppSource: string;
  jsCompanion: string;
  instructions: string;
  githubUrl?: string;
  likes: number;
  downloads: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

let dbInstance: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'click_studio.sqlite');
  dbInstance = new DatabaseSync(dbPath);

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS applets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      version TEXT NOT NULL DEFAULT 'v1.0.0',
      category TEXT NOT NULL DEFAULT 'Games',
      iconType TEXT NOT NULL DEFAULT 'gamepad',
      author TEXT NOT NULL,
      description TEXT NOT NULL,
      tags TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_review',
      cppHeader TEXT NOT NULL,
      cppSource TEXT NOT NULL,
      jsCompanion TEXT NOT NULL,
      instructions TEXT NOT NULL,
      githubUrl TEXT,
      likes INTEGER NOT NULL DEFAULT 0,
      downloads INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      rejectionReason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_applets_status ON applets(status);
    CREATE INDEX IF NOT EXISTS idx_applets_category ON applets(category);
    CREATE INDEX IF NOT EXISTS idx_applets_slug ON applets(slug);
  `);

  try {
    dbInstance.exec("ALTER TABLE applets ADD COLUMN version TEXT DEFAULT 'v1.0.0';");
  } catch (e) {}
  try {
    dbInstance.exec("ALTER TABLE applets ADD COLUMN category TEXT DEFAULT 'Games';");
  } catch (e) {}
  try {
    dbInstance.exec("ALTER TABLE applets ADD COLUMN iconType TEXT DEFAULT 'gamepad';");
  } catch (e) {}
  try {
    dbInstance.exec("ALTER TABLE applets ADD COLUMN downloads INTEGER DEFAULT 0;");
  } catch (e) {}
  try {
    dbInstance.exec("ALTER TABLE applets ADD COLUMN githubUrl TEXT;");
  } catch (e) {}

  seedDefaultApplets(dbInstance);

  return dbInstance;
}

function seedDefaultApplets(db: DatabaseSync) {
  const seeds: Omit<AppletRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    "title": "Sisyphus Counter",
    "slug": "sisyphus-push",
    "version": "v1.2.0",
    "category": "Games",
    "iconType": "gamepad",
    "author": "Prajjwal",
    "description": "The iconic Click counter game from Click OS. Heave the boulder up the mountain slope with animated rotating rocks, wispy sky clouds, and 1-second inactivity rollback. Real community baseline: 35,816 collective clicks towards the 1,000,000 milestone.",
    "tags": [
      "game",
      "arcade",
      "clicker",
      "sisyphus",
      "firmware"
    ],
    "status": "approved",
    "featured": true,
    "likes": 184,
    "downloads": 1420,
    "githubUrl": "https://github.com/prajjwalprajjwal/Click/tree/main/firmware/src/applets/clicker",
    "instructions": "Tap ACTION to push the boulder uphill and advance the counter. If you pause for 1.0s, the boulder rolls backwards downhill! Tap during rollback to catch and hold the boulder. Hold MODE to reset session.",
    "cppHeader": "#ifndef COUNTER_APPLET_H\n#define COUNTER_APPLET_H\n\n#include <stdint.h>\n#include \"Applet.h\"\n#include \"ClickCounter.h\"\n#include \"PersistenceManager.h\"\n#include \"CounterRenderer.h\"\n\nenum class SisyphusAnimMode : uint8_t {\n    IDLE_WALKING,\n    PUSHING,\n    ROLLING_BACK\n};\n\nclass CounterApplet : public Applet {\nprivate:\n    ClickCounter counter;\n    PersistenceManager persistence;\n    CounterRenderer renderer;\n\n    uint32_t milestoneFlags[MILESTONE_FLAG_WORDS] = {0};\n    bool storageReady = false;\n\n    // Animation & Gameplay State (stored during session)\n    SisyphusAnimMode animMode = SisyphusAnimMode::IDLE_WALKING;\n    uint8_t pushFrame = 0;\n    uint8_t boulderRotPhase = 0;\n    uint8_t pendingPushes = 0;\n\n    int32_t climbProgress = 0; // Persistent uphill position during session\n    float worldProgress = 0.0f;\n\n    uint32_t lastClickTime = 0;\n    uint32_t lastFrameTime = 0;\n    uint32_t lastDisplayTime = 0;\n    uint32_t lastCloudDriftTime = 0;\n    bool frameDirty = true;\n\n    // Paced Frame Timing (25 FPS push / 8 FPS walk / 30 FPS display refresh cap / 10 FPS idle cloud drift / 1s rollback)\n    static const uint32_t PUSH_FRAME_INTERVAL_MS = 40;  // 25 FPS\n    static const uint32_t WALK_FRAME_INTERVAL_MS = 125; // 8 FPS\n    static const uint32_t MIN_DISPLAY_INTERVAL_MS = 33; // 30 FPS ceiling to protect I2C bus\n    static const uint32_t CLOUD_DRIFT_INTERVAL_MS = 100; // 10 FPS automatic cloud drift\n    static const uint32_t INACTIVITY_ROLLBACK_DELAY_MS = 1000; // 1 second idle before rolling downhill\n    static const uint32_t ROLLBACK_FRAME_INTERVAL_MS = 40;     // 25 FPS rollback\n\n    void loadState();\n    void persistIfNeeded(bool force);\n    void handleClick();\n    void resetAll();\n    void updateAnimation(uint32_t now);\n\n#if CLICKER_DEBUG\n    void debugSimulateCount(const char* target);\n    void processDebugSerial();\n#endif\n\npublic:\n    void init() override;\n    void update() override;\n    void draw() override;\n    void cleanup() override;\n    void onPrepareSleep() override;\n\n    void onActionClick() override;\n    void onBothHeld() override;\n\n    void preloadState();\n    void persistNow();\n    void setLifetimeClicks(uint64_t val);\n    uint64_t getLifetimeClicks() const { return counter.getLifetimeClicks(); }\n    const char* getCountString() const { return counter.getString(); }\n};\n\n#endif // COUNTER_APPLET_H\n",
    "cppSource": "#include \"CounterApplet.h\"\n#include \"Display.h\"\n#include \"applets/screensaver/HomeApplet.h\"\n#include \"ClickerConfig.h\"\n#include \"SisyphusSprites.h\"\n#include \"system/WS2812.h\"\n#include \"system/SoundFX.h\"\n\nextern HomeApplet homeApplet;\n\nvoid CounterApplet::loadState() {\n  if (!storageReady) {\n    storageReady = persistence.begin();\n  }\n  if (!storageReady) {\n    Serial.println(\"[SISYPHUS] NVS unavailable, running in RAM only\");\n    counter.reset();\n    climbProgress = 0;\n    worldProgress = 0.0f;\n    boulderRotPhase = 0;\n    memset(milestoneFlags, 0, sizeof(milestoneFlags));\n    frameDirty = true;\n    return;\n  }\n\n  persistence.load(counter, milestoneFlags);\n  uint32_t savedOffset = persistence.getTerrainOffset();\n  worldProgress = static_cast<float>(savedOffset);\n  boulderRotPhase = static_cast<uint8_t>(savedOffset % BOULDER_FRAMES);\n\n  homeApplet.applyUnlockState(persistence.getHomeUnlockFlags());\n  animMode = SisyphusAnimMode::IDLE_WALKING;\n  pushFrame = 0;\n  pendingPushes = 0;\n  climbProgress = 0; // Fresh baseline on applet startup/cycle\n  lastClickTime = millis();\n  frameDirty = true;\n  lastFrameTime = millis();\n\n  Serial.print(\"[SISYPHUS] count = \");\n  Serial.println(counter.getString());\n}\n\nvoid CounterApplet::persistNow() {\n  if (!storageReady) {\n    return;\n  }\n  persistence.setTerrainOffset(static_cast<uint32_t>(worldProgress));\n  persistence.flush(counter, milestoneFlags);\n}\n\nvoid CounterApplet::setLifetimeClicks(uint64_t val) {\n  if (!storageReady) {\n    storageReady = persistence.begin();\n  }\n  counter.setLifetimeClicks(val);\n  persistence.markDirty();\n  persistNow();\n  frameDirty = true;\n}\n\nvoid CounterApplet::persistIfNeeded(bool force) {\n  if (!storageReady) {\n    return;\n  }\n\n  uint32_t now = millis();\n  if (force || persistence.shouldPersist(now)) {\n    persistence.setTerrainOffset(static_cast<uint32_t>(worldProgress));\n    persistence.flush(counter, milestoneFlags);\n    persistence.clearPeriodicCounter();\n  }\n}\n\nvoid CounterApplet::handleClick() {\n  // 1. Increment counter immediately (pure decimal arithmetic, no integer\n  // overflow)\n  if (!counter.increment()) {\n    return;\n  }\n\n  uint32_t now = millis();\n  lastClickTime = now;\n  persistence.onClickRecorded(now);\n\n#if CLICKER_DEBUG\n  Serial.print(\"[SISYPHUS] count = \");\n  Serial.println(counter.getString());\n#endif\n\n  // Check home unlock milestones\n  uint64_t lifetime = counter.getLifetimeClicks();\n  uint32_t unlocks = persistence.getHomeUnlockFlags();\n  if (lifetime >= 100)\n    unlocks |= 0x01;\n  if (lifetime >= 500)\n    unlocks |= 0x02;\n  if (lifetime >= 5000)\n    unlocks |= 0x04;\n  if (lifetime >= 10000)\n    unlocks |= 0x08;\n  if (lifetime >= 75000)\n    unlocks |= 0x10;\n  if (lifetime >= 30000)\n    unlocks |= 0x20;\n  if (lifetime >= 175000)\n    unlocks |= 0x40;\n  if (unlocks != persistence.getHomeUnlockFlags()) {\n    persistence.setHomeUnlockFlags(unlocks);\n    homeApplet.applyUnlockState(unlocks);\n    WS2812Driver::startCelebration(500); // Brief rainbow pulse on milestone unlock!\n  } else if (lifetime > 0 && (lifetime % 50 == 0)) {\n    WS2812Driver::startCelebration(500); // Brief rainbow pulse every 50 clicks!\n  }\n\n  // While rolling backward, register the first click to hold the rolling position at that step for 1 second\n  if (animMode == SisyphusAnimMode::ROLLING_BACK) {\n    animMode = SisyphusAnimMode::IDLE_WALKING;\n    pushFrame = 0;\n    pendingPushes = 0;\n    lastFrameTime = now;\n    frameDirty = true;\n    WS2812Driver::clear(); // Stopped moving back!\n    SoundFX::stop();\n    return;\n  }\n\n  // 2. Advance boulder rotation and persistent uphill position per click\n  boulderRotPhase =\n      static_cast<uint8_t>((boulderRotPhase + 1) % BOULDER_FRAMES);\n  climbProgress += 2;    // Persistent uphill movement step\n  worldProgress += 1.0f; // Distant clouds/mountain parallax\n\n  // 3. Queue push animation\n  if (pendingPushes < 5) {\n    pendingPushes++;\n  }\n\n  // Start push heave immediately\n  if (animMode != SisyphusAnimMode::PUSHING) {\n    animMode = SisyphusAnimMode::PUSHING;\n    pushFrame = 0;\n    lastFrameTime = now;\n    frameDirty = true;\n  }\n}\n\nvoid CounterApplet::updateAnimation(uint32_t now) {\n  if (animMode == SisyphusAnimMode::PUSHING) {\n    // Paced push heave animation: 25 FPS (40ms per frame)\n    if ((now - lastFrameTime) >= PUSH_FRAME_INTERVAL_MS) {\n      lastFrameTime = now;\n      pushFrame++;\n\n      if (pushFrame >= 4) {\n        // Completed one 4-frame push cycle:\n        if (pendingPushes > 0) {\n          pendingPushes--;\n        }\n\n        if (pendingPushes > 0) {\n          // Direct chain into next queued push\n          pushFrame = 0;\n        } else {\n          // Transition to idle upright posture AT CURRENT CLIMBED POSITION\n          animMode = SisyphusAnimMode::IDLE_WALKING;\n          pushFrame = 0;\n        }\n      }\n      frameDirty = true;\n    }\n  } else if (animMode == SisyphusAnimMode::ROLLING_BACK) {\n    // Reverse downhill motion: paced backwards stride and opposite boulder roll\n\n    if ((now - lastFrameTime) >= ROLLBACK_FRAME_INTERVAL_MS) {\n      lastFrameTime = now;\n\n      // Paced downhill step with gravity scaling at high altitude\n      uint8_t step = 1;\n      if (climbProgress > 200) {\n        step = 3;\n      } else if (climbProgress > 100) {\n        step = 2;\n      }\n\n      if (climbProgress <= step) {\n        climbProgress = 0;\n        animMode = SisyphusAnimMode::IDLE_WALKING;\n        pushFrame = 0;\n        WS2812Driver::clear(); // Stopped at base\n        SoundFX::playSisyphusBottomChime(); // Small light chime once it reaches bottom!\n      } else {\n        climbProgress -= step;\n        // Cycle legs in reverse stride (3 -> 2 -> 1 -> 0 -> 3...)\n        pushFrame = (pushFrame + 3) % 4;\n      }\n\n      // Rotate boulder in opposite direction (counter-clockwise / downhill)\n      boulderRotPhase = static_cast<uint8_t>(\n          (boulderRotPhase + BOULDER_FRAMES - (step % BOULDER_FRAMES)) %\n          BOULDER_FRAMES);\n\n      // Distant background parallax moves in reverse\n      float worldStep = step * 0.5f;\n      if (worldProgress >= worldStep) {\n        worldProgress -= worldStep;\n      } else {\n        worldProgress = 0.0f;\n      }\n\n      frameDirty = true;\n    }\n  } else {\n    // IDLE_WALKING: If stopped clicking for 2 seconds while uphill, roll back downhill\n    if (climbProgress > 0 &&\n        (now - lastClickTime) >= INACTIVITY_ROLLBACK_DELAY_MS) {\n      animMode = SisyphusAnimMode::ROLLING_BACK;\n      lastFrameTime = now;\n      pushFrame = 3;\n      frameDirty = true;\n      SoundFX::playSisyphusDownhill(); // Short 3 beeps when it starts moving downhill!\n    } else if ((now - lastFrameTime) >= WALK_FRAME_INTERVAL_MS) {\n      lastFrameTime = now;\n    }\n  }\n}\n\n#if CLICKER_DEBUG\nvoid CounterApplet::debugSimulateCount(const char *target) {\n  counter.setString(target);\n  frameDirty = true;\n  persistIfNeeded(true);\n\n  Serial.print(\"[SISYPHUS] Simulated count = \");\n  Serial.println(counter.getString());\n}\n\nvoid CounterApplet::processDebugSerial() {\n  if (!Serial.available()) {\n    return;\n  }\n\n  String line = Serial.readStringUntil('\\n');\n  line.trim();\n  if (line.length() == 0) {\n    return;\n  }\n\n  if (line.equalsIgnoreCase(\"info\")) {\n    Serial.print(\"[SISYPHUS] count = \");\n    Serial.println(counter.getString());\n    return;\n  }\n\n  if (line.startsWith(\"sim \")) {\n    debugSimulateCount(line.substring(4).c_str());\n    return;\n  }\n\n  Serial.println(\"[SISYPHUS] Debug commands: info | sim <count>\");\n}\n#endif\n\nvoid CounterApplet::resetAll() {\n  counter.reset();\n  climbProgress = 0;\n  worldProgress = 0.0f;\n  boulderRotPhase = 0;\n  pendingPushes = 0;\n  animMode = SisyphusAnimMode::IDLE_WALKING;\n  pushFrame = 0;\n  lastClickTime = millis();\n  memset(milestoneFlags, 0, sizeof(milestoneFlags));\n\n  persistence.setHomeUnlockFlags(0);\n  persistence.setLastCycleCompleteLifetime(0);\n  persistence.setTerrainOffset(0);\n  persistence.markDirty();\n\n  homeApplet.applyUnlockState(0);\n  persistNow();\n  WS2812Driver::clear();\n  SoundFX::stop();\n  frameDirty = true;\n\n  Serial.println(\"[SISYPHUS] Reset - count cleared\");\n}\n\nvoid CounterApplet::preloadState() { loadState(); }\n\nvoid CounterApplet::init() {\n  preloadState();\n  animMode = SisyphusAnimMode::IDLE_WALKING;\n  pushFrame = 0;\n  pendingPushes = 0;\n  climbProgress = 0; // Reset position when cycled through app or rebooted\n  lastClickTime = millis();\n  frameDirty = true;\n  lastFrameTime = millis();\n  lastDisplayTime = 0;\n\n#if CLICKER_DEBUG\n  Serial.println(\"[SISYPHUS] Debug enabled. Commands: info | sim <count>\");\n#endif\n}\n\nvoid CounterApplet::update() {\n  uint32_t now = millis();\n  updateAnimation(now);\n  persistIfNeeded(false);\n\n  // Smooth automatic cloud drift when idle: trigger frame redraw at 10 FPS\n  if ((now - lastCloudDriftTime) >= CLOUD_DRIFT_INTERVAL_MS) {\n    lastCloudDriftTime = now;\n    frameDirty = true;\n  }\n\n#if CLICKER_DEBUG\n  processDebugSerial();\n#endif\n\n  // Yield CPU time to FreeRTOS scheduler so IDLE task and background threads\n  // stay fed\n  yield();\n}\n\nvoid CounterApplet::draw() {\n  uint32_t now = millis();\n  // Enforce 30 FPS ceiling to prevent I2C bus flooding and allow CPU breathing\n  // room\n  if (!frameDirty || (now - lastDisplayTime) < MIN_DISPLAY_INTERVAL_MS) {\n    return;\n  }\n  lastDisplayTime = now;\n  frameDirty = false;\n\n  // Calculate persistent screen positions on organic slope:\n  int16_t charX = 0;\n  int16_t bldX = 0;\n  int32_t hillOffset = 0;\n\n  if (climbProgress <= 18) {\n    // Starts on flat ground plane at base (charX=18, bldX=38), climbs onto the\n    // hill\n    charX = 18 + (climbProgress * 24) / 18;\n    bldX = 38 + (climbProgress * 26) / 18;\n    hillOffset = 0;\n  } else {\n    // Steady climbing position on the bottom-right hill:\n    charX = 42;\n    bldX = 64;\n    hillOffset = climbProgress - 18;\n  }\n\n  const uint8_t *sisBmp = nullptr;\n  uint8_t sisW = 0;\n  uint8_t sisH = 0;\n\n  if (animMode == SisyphusAnimMode::IDLE_WALKING) {\n    // Resting posture: braced with one hand holding the rock so it doesn't fall\n    // down!\n    sisBmp = sisyphus_resting_bmp;\n    sisW = SISYPHUS_REST_WIDTH;\n    sisH = SISYPHUS_REST_HEIGHT;\n  } else {\n    // Push heave frames: 0, 1, 2, 3 -> dynamic two-legged strides\n    sisBmp =\n        (const uint8_t *)pgm_read_ptr(&(sisyphus_push_frames[pushFrame % 4]));\n    sisW = SISYPHUS_PUSH_WIDTH;\n    sisH = SISYPHUS_PUSH_HEIGHT;\n  }\n\n  // Render scene with bottom-right corner hill, downward moving flat ground\n  // plane, and resting brace\n  renderer.renderScene(counter.getString(), sisBmp, sisW, sisH, charX, bldX,\n                       boulderRotPhase, hillOffset, worldProgress,\n                       climbProgress);\n\n  // Exactly ONE I2C transfer per frame\n  display.display();\n  // Yield to FreeRTOS scheduler immediately after heavy 25ms I2C transfer\n  delay(1);\n}\n\nvoid CounterApplet::cleanup() {\n  WS2812Driver::clear();\n  SoundFX::stop();\n  persistNow();\n}\n\nvoid CounterApplet::onPrepareSleep() {\n  WS2812Driver::clear();\n  SoundFX::stop();\n  persistNow();\n}\n\nvoid CounterApplet::onActionClick() { handleClick(); }\n\nvoid CounterApplet::onBothHeld() { resetAll(); }\n",
    "jsCompanion": "class CounterApplet {\n  constructor() {\n    this.init();\n  }\n  init() {\n    // Real collective baseline from official API: 35,816\n    this.clicks = 35816;\n    this.climbProgress = 0; // 0..100\n    this.worldProgress = 0.0;\n    this.boulderFrame = 0;\n    this.pushFrame = 0;\n    this.animMode = 0; // 0: resting/idle, 1: pushing, 2: rolling back\n    this.lastClickTime = performance.now();\n    this.lastFrameTime = performance.now();\n    this.pendingPushes = 0;\n    this.rollingDown = false;\n  }\n  update(dt, input) {\n    const now = performance.now();\n\n    // After 1000ms inactivity while uphill, roll back downhill!\n    if (!this.rollingDown && this.climbProgress > 0 && (now - this.lastClickTime >= 1000)) {\n      this.rollingDown = true;\n      this.animMode = 2; // ROLLING_BACK\n      this.lastFrameTime = now;\n      if (input && input.sound) {\n        input.sound.playSisyphusDownhill();\n      }\n    }\n\n    if (this.animMode === 1) { // Pushing heave: 40ms per frame (25 FPS)\n      if (now - this.lastFrameTime >= 40) {\n        this.lastFrameTime = now;\n        this.pushFrame++;\n        if (this.pushFrame >= 4) {\n          if (this.pendingPushes > 0) this.pendingPushes--;\n          if (this.pendingPushes > 0) {\n            this.pushFrame = 0;\n          } else {\n            this.animMode = 0; // Return to resting brace\n            this.pushFrame = 0;\n          }\n        }\n      }\n    } else if (this.animMode === 2) { // Reverse downhill roll: 40ms per frame\n      if (now - this.lastFrameTime >= 40) {\n        this.lastFrameTime = now;\n        const step = this.climbProgress > 60 ? 3 : 2;\n        if (this.climbProgress <= step) {\n          this.climbProgress = 0;\n          this.animMode = 0;\n          this.rollingDown = false;\n          this.pushFrame = 0;\n          if (input && input.sound) input.sound.playSisyphusBottomChime();\n          if (input && input.leds) input.leds.flash(0, 180, 255, 300);\n        } else {\n          this.climbProgress -= step;\n          this.pushFrame = (this.pushFrame + 3) % 4; // Reverse leg movement\n          this.boulderFrame = (this.boulderFrame + 4) % 5; // Reverse boulder spin\n        }\n      }\n    }\n  }\n  draw(display) {\n    display.clear();\n    const now = performance.now();\n\n    // 1. Wispy Drifting Cloud (slow ~1.8px/s loop across sky)\n    const cloudLoop = 220;\n    const cloudTravel = Math.floor(now / 550 + this.worldProgress * 0.08);\n    const cx = 135 - (cloudTravel % cloudLoop);\n    if (typeof CLOUD_WISP_1_BMP !== 'undefined' && cx > -40 && cx < 128) {\n      display.drawBitmap(cx, 6, CLOUD_WISP_1_BMP, 36, 3, 1);\n    }\n\n    // 2. Distant mountain peaks\n    if (typeof DISTANT_MOUNTAINS_BMP !== 'undefined') {\n      const mtnOffset = Math.floor(this.worldProgress / 4) % 64;\n      display.drawBitmap(-mtnOffset, 42, DISTANT_MOUNTAINS_BMP, 64, 8, 1);\n      display.drawBitmap(64 - mtnOffset, 42, DISTANT_MOUNTAINS_BMP, 64, 8, 1);\n    }\n\n    // 3. Organic slope line matching CounterRenderer.cpp: flat 0..38 at y=62, up to (128, 26)\n    display.drawLine(0, 62, 38, 62, 1);\n    display.drawLine(38, 62, 128, 26, 1);\n    for (let gx = 44; gx < 128; gx += 14) {\n      const gy = Math.round(62 - (gx - 38) * 0.40);\n      display.drawPixel(gx, gy + 3, 1);\n      display.drawPixel(gx + 2, gy + 4, 1);\n    }\n\n    // 4. Character and Boulder Coordinates:\n    let charX = 0;\n    let bldX = 0;\n    if (this.climbProgress <= 18) {\n      charX = Math.round(18 + (this.climbProgress * 24) / 18);\n      bldX = Math.round(38 + (this.climbProgress * 26) / 18);\n    } else {\n      charX = 42;\n      bldX = 64;\n    }\n\n    const getGroundY = (x) => {\n      if (x <= 38) return 62;\n      return Math.round(62 - (x - 38) * 0.40);\n    };\n\n    const by = getGroundY(bldX + 14) - 28;\n    const sy = getGroundY(charX + 10) - 26;\n\n    // Draw Sisyphus Sprite\n    if (this.animMode === 1 && typeof SISYPHUS_PUSH_FRAMES !== 'undefined' && SISYPHUS_PUSH_FRAMES[this.pushFrame]) {\n      display.drawBitmap(charX, sy, SISYPHUS_PUSH_FRAMES[this.pushFrame], 27, 24, 1);\n    } else if (typeof SISYPHUS_REST_BMP !== 'undefined') {\n      display.drawBitmap(charX, sy, SISYPHUS_REST_BMP, 26, 27, 1);\n    } else if (typeof SISYPHUS_IDLE_BMP !== 'undefined') {\n      display.drawBitmap(charX, sy, SISYPHUS_IDLE_BMP, 20, 30, 1);\n    }\n\n    // Draw Boulder (29x29 rotating frame 0..4)\n    if (typeof BOULDER_FRAMES !== 'undefined' && BOULDER_FRAMES[this.boulderFrame]) {\n      display.drawBitmap(bldX, by, BOULDER_FRAMES[this.boulderFrame], 29, 29, 1);\n    }\n\n    // 5. Counter text at top-left (5, 5) with clear background\n    display.fillRect(4, 4, 80, 10, 0);\n    display.drawText(this.clicks.toLocaleString(), 5, 5, 1);\n  }\n  onActionClick(env) {\n    const now = performance.now();\n    // Catch boulder if currently rolling backward\n    if (this.rollingDown) {\n      this.rollingDown = false;\n      this.animMode = 0;\n      this.pushFrame = 0;\n      this.lastClickTime = now;\n      if (env && env.sound) env.sound.stop();\n      return;\n    }\n\n    this.clicks++;\n    this.climbProgress = Math.min(100, this.climbProgress + 2);\n    this.worldProgress += 1.0;\n    this.boulderFrame = (this.boulderFrame + 1) % 5;\n    this.lastClickTime = now;\n    this.animMode = 1; // Pushing\n    if (this.pendingPushes < 4) this.pendingPushes++;\n    this.lastFrameTime = now;\n\n    if (env && env.sound) env.sound.playClick();\n    if (env && env.leds) {\n      env.leds.flash(255, 120, 0, 50);\n      if (this.clicks % 50 === 0) {\n        env.leds.celebrate(500);\n      }\n    }\n  }\n  onModeClick(env) {\n    this.climbProgress = 0;\n    this.rollingDown = false;\n    this.animMode = 0;\n    if (env && env.sound) env.sound.playTone(1400, 50);\n  }\n  onModeHold(env) {\n    this.climbProgress = 0;\n    this.rollingDown = false;\n    this.animMode = 0;\n    if (env && env.sound) env.sound.playTone(1000, 120);\n  }\n}"
  },
  {
    "title": "Floppy Bird",
    "slug": "floppy-bird",
    "version": "v1.1.0",
    "category": "Games",
    "iconType": "gamepad",
    "author": "Prajjwal",
    "description": "The official arcade classic from Click OS firmware. Features the authentic 14x9 bird sprite bitmap, responsive jump impulses, pipe collision mechanics, score and high-score memory, and buzzer sound effects. Leaderboard record: 70 pipes (NJ Clicks).",
    "tags": [
      "game",
      "arcade",
      "fidget",
      "retro",
      "firmware"
    ],
    "status": "approved",
    "featured": true,
    "likes": 240,
    "downloads": 1890,
    "githubUrl": "https://github.com/prajjwalprajjwal/Click/tree/main/firmware/src/applets/flappy_bird",
    "instructions": "Tap ACTION to flap wings and gain altitude. Fly through pipe gaps without crashing into pipes, floor, or ceiling. On Game Over, wait 1.5s and tap ACTION to retry.",
    "cppHeader": "#ifndef FLAPPY_BIRD_APPLET_H\n#define FLAPPY_BIRD_APPLET_H\n\n#include <Arduino.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>\n#include <Preferences.h>\n#include \"Applet.h\"\n\n// Automatically includes pre-converted user PNG screen assets\n#if __has_include(\"generated_assets/all_assets.h\")\n  #include \"generated_assets/all_assets.h\"\n#endif\n\n// Bird sprite — uses FlappyBirdApplet_char.png if converted, otherwise falls back to hardcoded 14x9 bitmap\n#ifdef GENERATED_FLAPPYBIRDAPPLET_CHAR_H\n  #define BIRD_WIDTH  FLAPPYBIRDAPPLET_CHAR_WIDTH\n  #define BIRD_HEIGHT FLAPPYBIRDAPPLET_CHAR_HEIGHT\n  #define bird_bmp    FlappyBirdApplet_char_bmp\n#else\n  // Fallback: hardcoded 14x9 pixel bird sprite\n  #define BIRD_WIDTH  14\n  #define BIRD_HEIGHT 9\n  static const uint8_t bird_bmp[] PROGMEM = {\n      0xE0, 0x07, 0xAE, 0x08, 0x91, 0x0A, 0x91, 0x08,\n      0x21, 0x0F, 0x3E, 0x3C, 0x04, 0x3C, 0x08, 0x02,\n      0xF0, 0x01\n  };\n#endif\n\nclass FlappyBirdApplet : public Applet {\nprivate:\n    enum GameState : uint8_t {\n        STATE_IDLE     = 0,\n        STATE_PLAYING  = 1,\n        STATE_GAMEOVER = 2\n    };\n\n    GameState gameState = STATE_IDLE;\n\n    // Physics Engine Variables\n    float birdX        = 20.0f;\n    float birdY        = 24.0f;\n    float velocity     = 0.0f;\n    static constexpr float kGravity     = 0.14f; // Smooth drop rate\n    static constexpr float kJumpImpulse = -1.9f; // Responsive jump\n\n    // Pipe Parameters\n    static constexpr int   NUM_PIPES   = 2;\n    static constexpr int   PIPE_WIDTH  = 8;\n    static constexpr int   GAP_HEIGHT  = 28;\n    static constexpr float PIPE_SPEED  = 1.0f;\n\n    float pipeX[NUM_PIPES];\n    int   pipeGapY[NUM_PIPES];\n    bool  pipePassed[NUM_PIPES] = {false, false};\n\n    // Non-blocking timer (~40 FPS execution loop)\n    unsigned long lastFrameTime = 0;\n    static constexpr unsigned long FRAME_INTERVAL_MS = 25;\n\n    // Game over input cooldown (prevents accidental immediate restart)\n    unsigned long gameOverTime = 0;\n    static constexpr unsigned long GAMEOVER_COOLDOWN_MS = 1500;\n\n    volatile bool jumpRequested = false;\n\n    // NVS Memory & High Score\n    uint16_t currentScore = 0;\n    uint16_t highScore    = 0;\n    Preferences prefs;\n\n    void resetGame();\n    void handleGameOver();\n    void updateAndDraw(Adafruit_SSD1306& disp);\n\npublic:\n    void init()    override;\n    void update()  override;\n    void draw()    override;\n    void cleanup() override;\n\n    // Input callback override matching Click OSManager architecture\n    void onActionClick() override {\n        // Discard action click during game-over cooldown\n        if (gameState == STATE_GAMEOVER && (millis() - gameOverTime < GAMEOVER_COOLDOWN_MS)) {\n            return;\n        }\n        jumpRequested = true;\n    }\n\n    void preloadState();\n    uint16_t getHighScore() const { return highScore; }\n    void setHighScore(uint16_t score) {\n        if (score > highScore) {\n            highScore = score;\n            prefs.begin(\"click_stats\", false);\n            prefs.putUInt(\"floppy_hi\", highScore);\n            prefs.putUInt(\"flappy_hi\", highScore);\n            prefs.end();\n            // Also maintain legacy flappy namespace for backwards compatibility\n            prefs.begin(\"flappy\", false);\n            prefs.putUInt(\"high\", highScore);\n            prefs.end();\n        }\n    }\n};\n\nusing FloppyBirdApplet = FlappyBirdApplet;\n\n#endif // FLAPPY_BIRD_APPLET_H\n",
    "cppSource": "#include \"FlappyBirdApplet.h\"\n#include \"Display.h\"\n#include \"system/WS2812.h\"\n#include \"system/SoundFX.h\"\n\nvoid FlappyBirdApplet::preloadState() {\n    // Read High Score from ESP32 / RP2354 NVS memory (checks floppy_hi first, then flappy_hi)\n    prefs.begin(\"click_stats\", true);\n    highScore = prefs.getUInt(\"floppy_hi\", prefs.getUInt(\"flappy_hi\", 0));\n    prefs.end();\n}\n\nvoid FlappyBirdApplet::init() {\n    jumpRequested = false;\n    gameState     = STATE_IDLE;\n    preloadState();\n    resetGame();\n}\n\nvoid FlappyBirdApplet::update() {}\n\nvoid FlappyBirdApplet::draw() {\n    extern Adafruit_SSD1306 display;\n    updateAndDraw(display);\n}\n\nvoid FlappyBirdApplet::cleanup() {\n    gameState     = STATE_IDLE;\n    jumpRequested = false;\n    WS2812Driver::clear();\n    SoundFX::stop();\n}\n\nvoid FlappyBirdApplet::resetGame() {\n    birdX        = 20.0f;\n    birdY        = 24.0f;\n    velocity     = 0.0f;\n    currentScore = 0;\n\n    // Spawn pipes far enough right to prevent instant start death\n    for (int i = 0; i < NUM_PIPES; ++i) {\n        pipeX[i]      = 140.0f + (i * 75.0f);\n        pipeGapY[i]   = random(6, 64 - GAP_HEIGHT - 6);\n        pipePassed[i] = false;\n    }\n}\n\nvoid FlappyBirdApplet::handleGameOver() {\n    gameState = STATE_GAMEOVER;\n    gameOverTime = millis();\n    jumpRequested = false; // Discard any pending jump request on game over\n\n    if (currentScore > highScore) {\n        highScore = currentScore;\n        // Save new high score into NVS unresetable storage (dual-key for backward compatibility)\n        prefs.begin(\"click_stats\", false);\n        prefs.putUInt(\"floppy_hi\", highScore);\n        prefs.putUInt(\"flappy_hi\", highScore);\n        prefs.end();\n        // High score celebratory fanfare and brief rainbow dance (0.5s)\n        SoundFX::playCelebrationFanfare();\n        WS2812Driver::startCelebration(500);\n    } else {\n        // Crash / game over sound and red alert flash for game over\n        SoundFX::playGameOver();\n        WS2812Driver::flash(255, 0, 0, 450);\n    }\n}\n\nvoid FlappyBirdApplet::updateAndDraw(Adafruit_SSD1306& disp) {\n    unsigned long now = millis();\n\n    // Read action trigger from InputManager event callback\n    bool pressed  = jumpRequested;\n    jumpRequested = false;\n\n    // Non-blocking frame loop\n    if (now - lastFrameTime >= FRAME_INTERVAL_MS) {\n        lastFrameTime = now;\n\n        if (gameState == STATE_PLAYING) {\n            if (pressed) {\n                velocity = kJumpImpulse;\n                SoundFX::playFlap();\n            }\n            velocity += kGravity;\n            birdY    += velocity;\n\n            // Screen floor/ceiling bounds\n            if (birdY < 0.0f || birdY + BIRD_HEIGHT >= 64) {\n                handleGameOver();\n            }\n\n            // Pipe collisions and passing detection\n            for (int i = 0; i < NUM_PIPES; ++i) {\n                pipeX[i] -= PIPE_SPEED;\n\n                // Passing through pipes successfully\n                if (!pipePassed[i] && (pipeX[i] + PIPE_WIDTH < birdX)) {\n                    pipePassed[i] = true;\n                    ++currentScore;\n                    SoundFX::playScore(); // Pipe cleared double chime!\n                }\n\n                if (pipeX[i] < -PIPE_WIDTH) {\n                    pipeX[i]      = 128.0f;\n                    pipeGapY[i]   = random(6, 64 - GAP_HEIGHT - 6);\n                    pipePassed[i] = false;\n                }\n\n                bool xOverlap = (pipeX[i] < birdX + BIRD_WIDTH) &&\n                                (pipeX[i] + PIPE_WIDTH > birdX);\n                bool yOutside = (birdY < pipeGapY[i]) ||\n                                (birdY + BIRD_HEIGHT > pipeGapY[i] + GAP_HEIGHT);\n                if (xOverlap && yOutside) handleGameOver();\n            }\n\n        } else if (gameState == STATE_IDLE) {\n            if (pressed) {\n                resetGame();\n                gameState = STATE_PLAYING;\n                velocity = kJumpImpulse;\n                SoundFX::playFlap();\n            }\n        } else if (gameState == STATE_GAMEOVER) {\n            // Only allow restart after cooldown has elapsed\n            if (pressed && (now - gameOverTime >= GAMEOVER_COOLDOWN_MS)) {\n                resetGame();\n                gameState = STATE_PLAYING;\n                velocity = kJumpImpulse;\n                SoundFX::playFlap();\n            }\n        }\n    }\n\n    disp.clearDisplay();\n\n    // --- DRAWING RENDER LAYER ---\n    if (gameState == STATE_IDLE) {\n#ifdef GENERATED_FLAPPYBIRDAPPLET_START_H\n        // RENDER USER CUSTOM DESIGN START SCREEN (128x64)\n        disp.drawBitmap(0, 0, FlappyBirdApplet_start_bmp,\n                        FLAPPYBIRDAPPLET_START_WIDTH, FLAPPYBIRDAPPLET_START_HEIGHT,\n                        SSD1306_WHITE);\n#else\n        // Fallback layout if start image header is not generated\n        disp.drawBitmap(57, 12, bird_bmp, BIRD_WIDTH, BIRD_HEIGHT, SSD1306_WHITE);\n        disp.setTextSize(1);\n        disp.setTextColor(SSD1306_WHITE);\n        disp.setCursor(30, 32);\n        disp.print(F(\"FLOPPY BIRD\"));\n        disp.setCursor(2, 48);\n        disp.print(F(\"PRESS ACTION TO START\"));\n#endif\n\n    } else if (gameState == STATE_PLAYING) {\n        // Draw Bird Sprite\n        disp.drawBitmap((int)birdX, (int)birdY, bird_bmp, BIRD_WIDTH, BIRD_HEIGHT, SSD1306_WHITE);\n\n        // Draw Pipes\n        for (int i = 0; i < NUM_PIPES; ++i) {\n            int px = (int)pipeX[i];\n            disp.fillRect(px, 0, PIPE_WIDTH, pipeGapY[i], SSD1306_WHITE);\n            disp.fillRect(px, pipeGapY[i] + GAP_HEIGHT, PIPE_WIDTH, 64 - (pipeGapY[i] + GAP_HEIGHT), SSD1306_WHITE);\n        }\n\n        // HUD Score (Y=6 avoids top boundary crop)\n        disp.setTextSize(1);\n        disp.setTextColor(SSD1306_WHITE);\n        disp.setCursor(4, 10);\n        disp.print(currentScore);\n\n    } else if (gameState == STATE_GAMEOVER) {\n#ifdef GENERATED_FLAPPYBIRDAPPLET_END_H\n        // RENDER USER CUSTOM DESIGN END SCREEN (128x64)\n        disp.drawBitmap(0, 0, FlappyBirdApplet_end_bmp,\n                        FLAPPYBIRDAPPLET_END_WIDTH, FLAPPYBIRDAPPLET_END_HEIGHT,\n                        SSD1306_WHITE);\n\n        // Dynamically overlay score data on top of user custom screen graphic\n        disp.setTextSize(1);\n        disp.setTextColor(SSD1306_WHITE);\n        disp.setCursor(58, 36);\n        disp.print(F(\"SCORE: \"));\n        disp.print(currentScore);\n        disp.setCursor(58, 48);\n        disp.print(F(\"BEST:  \"));\n        disp.print(highScore);\n#else\n        // Fallback layout\n        disp.setTextSize(1);\n        disp.setTextColor(SSD1306_WHITE);\n        disp.setCursor(37, 8);\n        disp.print(F(\"GAME OVER\"));\n        disp.setCursor(26, 24);\n        disp.print(F(\"SCORE: \"));\n        disp.print(currentScore);\n        disp.setCursor(26, 36);\n        disp.print(F(\"BEST:  \"));\n        disp.print(highScore);\n        disp.setCursor(8, 50);\n        disp.print(F(\"PRESS ACTION TO RETRY\"));\n#endif\n    }\n\n    disp.display();\n}\n",
    "jsCompanion": "class FlappyBirdApplet {\n  constructor() {\n    this.init();\n  }\n  init() {\n    this.state = 0; // 0: IDLE, 1: PLAYING, 2: GAMEOVER\n    this.highScore = 70; // Real hardware leaderboard record (NJ Clicks: 70 pipes)\n    this.resetGame();\n  }\n  resetGame() {\n    this.birdX = 20.0;\n    this.birdY = 24.0;\n    this.velocity = 0.0;\n    this.gravity = 0.14; // Exact firmware kGravity\n    this.jumpImpulse = -1.9; // Exact firmware kJumpImpulse\n    this.pipeWidth = 8;\n    this.gapHeight = 28;\n    this.pipeSpeed = 1.0; // Exact firmware PIPE_SPEED (1px per 25ms tick)\n    this.numPipes = 2;\n    this.pipes = [\n      { x: 140.0, gapY: 18, passed: false },\n      { x: 215.0, gapY: 12, passed: false }\n    ];\n    this.score = 0;\n    this.gameOverTime = 0;\n    this.acc = 0;\n    this.jumpRequested = false;\n  }\n  update(dt, input) {\n    if (this.state !== 1) return;\n\n    // Fixed 25ms tick accumulator (~40 FPS) identical to RP2354A firmware loop\n    this.acc = (this.acc || 0) + dt;\n    while (this.acc >= 25) {\n      this.acc -= 25;\n      this.tick(input);\n      if (this.state !== 1) break;\n    }\n  }\n  tick(input) {\n    if (this.jumpRequested) {\n      this.jumpRequested = false;\n      this.velocity = this.jumpImpulse;\n      if (input && input.sound) input.sound.playFlap();\n    }\n\n    this.velocity += this.gravity;\n    this.birdY += this.velocity;\n\n    // Ceiling and floor boundaries\n    if (this.birdY < 0.0 || this.birdY + 9 >= 64) {\n      this.handleGameOver(input);\n      return;\n    }\n\n    // Pipe movements and collisions\n    for (let i = 0; i < this.numPipes; i++) {\n      const p = this.pipes[i];\n      p.x -= this.pipeSpeed;\n\n      // Pipe passed detection\n      if (!p.passed && (p.x + this.pipeWidth < this.birdX)) {\n        p.passed = true;\n        this.score++;\n        if (input && input.sound) input.sound.playScore();\n      }\n\n      // Pipe respawn\n      if (p.x < -this.pipeWidth) {\n        p.x = 135.0;\n        p.gapY = 6 + Math.floor(Math.random() * (64 - this.gapHeight - 12));\n        p.passed = false;\n      }\n\n      // Pipe AABB collision check\n      const xOverlap = (p.x < this.birdX + 14) && (p.x + this.pipeWidth > this.birdX);\n      const yOutside = (this.birdY < p.gapY) || (this.birdY + 9 > p.gapY + this.gapHeight);\n      if (xOverlap && yOutside) {\n        this.handleGameOver(input);\n        return;\n      }\n    }\n  }\n  handleGameOver(input) {\n    this.state = 2;\n    this.gameOverTime = performance.now();\n    this.jumpRequested = false;\n    if (this.score > this.highScore) {\n      this.highScore = this.score;\n      if (input && input.sound) input.sound.playCelebrationFanfare();\n      if (input && input.leds) input.leds.celebrate(1500);\n    } else {\n      if (input && input.sound) input.sound.playGameOver();\n      if (input && input.leds) input.leds.flash(255, 0, 0, 450);\n    }\n  }\n  draw(display) {\n    display.clear();\n\n    if (this.state === 0) {\n      // Start Screen\n      if (typeof FLAPPY_BIRD_START_BMP !== 'undefined') {\n        display.drawBitmap(0, 0, FLAPPY_BIRD_START_BMP, 128, 64, 1);\n      } else {\n        display.drawText(\"FLOPPY BIRD\", 30, 24, 1);\n        display.drawText(\"PRESS ACTION TO START\", 2, 44, 1);\n      }\n    } else if (this.state === 1) {\n      // Draw Bird (14x9 bitmap)\n      const bx = Math.round(this.birdX);\n      const by = Math.round(this.birdY);\n      if (typeof FLAPPY_BIRD_CHAR_BMP !== 'undefined') {\n        display.drawBitmap(bx, by, FLAPPY_BIRD_CHAR_BMP, 14, 9, 1);\n      } else {\n        display.drawCircle(bx + 6, by + 4, 4, true, 1);\n      }\n\n      // Draw Pipes\n      for (let i = 0; i < this.numPipes; i++) {\n        const p = this.pipes[i];\n        const px = Math.round(p.x);\n        display.fillRect(px, 0, this.pipeWidth, p.gapY, 1);\n        display.fillRect(px, p.gapY + this.gapHeight, this.pipeWidth, 64 - (p.gapY + this.gapHeight), 1);\n      }\n\n      // HUD Score\n      display.drawText(\"\" + this.score, 6, 6, 1);\n    } else if (this.state === 2) {\n      // Game Over Screen\n      if (typeof FLAPPY_BIRD_END_BMP !== 'undefined') {\n        display.drawBitmap(0, 0, FLAPPY_BIRD_END_BMP, 128, 64, 1);\n        display.drawText(\"SCORE: \" + this.score, 58, 36, 1);\n        display.drawText(\"BEST:  \" + this.highScore, 58, 48, 1);\n      } else {\n        display.drawText(\"GAME OVER\", 37, 8, 1);\n        display.drawText(\"SCORE: \" + this.score, 32, 24, 1);\n        display.drawText(\"BEST:  \" + this.highScore, 32, 36, 1);\n        display.drawText(\"PRESS ACTION TO RETRY\", 4, 50, 1);\n      }\n    }\n  }\n  onActionClick(env) {\n    const now = performance.now();\n    if (this.state === 0) {\n      this.resetGame();\n      this.state = 1;\n      this.velocity = this.jumpImpulse;\n      if (env && env.sound) env.sound.playFlap();\n    } else if (this.state === 1) {\n      this.jumpRequested = true;\n    } else if (this.state === 2) {\n      // Cooldown: 1500ms before allowing restart matching firmware\n      if (now - this.gameOverTime >= 1500) {\n        this.resetGame();\n        this.state = 1;\n        this.velocity = this.jumpImpulse;\n        if (env && env.sound) env.sound.playFlap();\n      }\n    }\n  }\n  onModeClick(env) {\n    this.resetGame();\n    this.state = 0;\n    if (env && env.sound) env.sound.playTone(800, 40);\n  }\n}"
  },
  {
    "title": "Just Ten Challenge",
    "slug": "just-ten",
    "version": "v1.0.4",
    "category": "Games",
    "iconType": "clock",
    "author": "Prajjwal",
    "description": "The official Click precision timing challenge from Click OS. Hold ACTION to initiate microsecond clock timing with breathing concentric circles. Release when you feel exactly 10.0000s have passed! Verified record: 9.9998s (-0.0002s deviation by Praj).",
    "tags": [
      "game",
      "timing",
      "reflex",
      "challenge",
      "firmware"
    ],
    "status": "approved",
    "featured": true,
    "likes": 135,
    "downloads": 980,
    "githubUrl": "https://github.com/prajjwalprajjwal/Click/tree/main/firmware/src/applets/timing_game",
    "instructions": "PRESS AND HOLD ACTION to begin counting. The circle breathes as you hold. Release at EXACTLY 10.0000 seconds! Releasing within 5% (9.5s – 10.5s) triggers the triumphant celebration fanfare.",
    "cppHeader": "#ifndef TIMING_GAME_APPLET_H\n#define TIMING_GAME_APPLET_H\n\n#include <stdint.h>\n#include <stddef.h>\n#include <Preferences.h>\n#include \"Applet.h\"\n\n// Automatically includes pre-converted user PNG screen assets\n#if __has_include(\"generated_assets/all_assets.h\")\n  #include \"generated_assets/all_assets.h\"\n#endif\n\nclass TimingGameApplet : public Applet {\nprivate:\n    enum State {\n        IDLE,\n        COUNTING,\n        RESULT\n    };\n\n    State state = IDLE;\n    bool wasPressing = false;\n    uint64_t holdStartUs = 0;\n    uint64_t holdDurationUs = 0;\n    uint32_t resultDisplayTime = 0;\n    Preferences prefs;\n    uint32_t bestTimeUs = 0;\n\n    static void formatSeconds4(uint64_t micros, char* buffer, size_t bufferSize);\n    static void formatDeviation4(int64_t diffMicros, char* buffer, size_t bufferSize);\n    void drawIdle() const;\n    void drawCounting(uint32_t nowMs) const;\n    void drawResult() const;\n    bool isActionPressed() const;\n\npublic:\n    void init() override;\n    void preloadState();\n    uint32_t getBestTimeUs() const { return bestTimeUs; }\n    double getBestTimeSec() const { return static_cast<double>(bestTimeUs) / 1000000.0; }\n    uint32_t getBestDeviationMs() const {\n        if (bestTimeUs == 0) return 0;\n        int64_t diffUs = std::abs(static_cast<int64_t>(bestTimeUs) - 10000000LL);\n        return static_cast<uint32_t>(diffUs / 1000);\n    }\n    void setBestTimeUs(uint32_t us) {\n        if (us == 0) return;\n        int64_t currentDiff = std::abs(static_cast<int64_t>(us) - 10000000LL);\n        int64_t bestDiff = (bestTimeUs == 0) ? -1 : std::abs(static_cast<int64_t>(bestTimeUs) - 10000000LL);\n        if (bestTimeUs == 0 || currentDiff < bestDiff) {\n            bestTimeUs = us;\n            prefs.begin(\"click_stats\", false);\n            prefs.putUInt(\"just_ten_time\", bestTimeUs);\n            prefs.end();\n        }\n    }\n    void update() override;\n    void draw() override;\n    void cleanup() override;\n\n    void onActionClick() override;\n    void onBothHeld() override;\n};\n\n#endif // TIMING_GAME_APPLET_H\n",
    "cppSource": "#include \"TimingGameApplet.h\"\n#include <Arduino.h>\n#include <cmath>\n#include \"InputManager.h\"\n#include \"Display.h\"\n#include \"fonts/ThemeFonts.h\"\n#include \"system/WS2812.h\"\n#include \"system/SoundFX.h\"\n\nvoid TimingGameApplet::preloadState() {\n    prefs.begin(\"click_stats\", true);\n    bestTimeUs = prefs.getUInt(\"just_ten_time\", 0);\n    prefs.end();\n}\n\nvoid TimingGameApplet::init() {\n    state = IDLE;\n    wasPressing = false;\n    holdStartUs = 0;\n    holdDurationUs = 0;\n    resultDisplayTime = 0;\n    preloadState();\n}\n\nbool TimingGameApplet::isActionPressed() const {\n    return isActionButtonPressed();\n}\n\nvoid TimingGameApplet::formatSeconds4(uint64_t micros, char* buffer, size_t bufferSize) {\n    uint32_t totalSec = static_cast<uint32_t>(micros / 1000000ULL);\n    uint32_t frac = static_cast<uint32_t>((micros % 1000000ULL) / 100ULL); // 4 decimal places\n    snprintf(buffer, bufferSize, \"%lu.%04lus\", (unsigned long)totalSec, (unsigned long)frac);\n}\n\nvoid TimingGameApplet::formatDeviation4(int64_t diffMicros, char* buffer, size_t bufferSize) {\n    char sign = '+';\n    uint64_t absDiff = 0;\n    if (diffMicros < 0) {\n        sign = '-';\n        absDiff = static_cast<uint64_t>(-diffMicros);\n    } else {\n        absDiff = static_cast<uint64_t>(diffMicros);\n    }\n    uint32_t totalSec = static_cast<uint32_t>(absDiff / 1000000ULL);\n    uint32_t frac = static_cast<uint32_t>((absDiff % 1000000ULL) / 100ULL); // 4 decimal places\n    snprintf(buffer, bufferSize, \"%c%lu.%04lus\", sign, (unsigned long)totalSec, (unsigned long)frac);\n}\n\nvoid TimingGameApplet::drawIdle() const {\n#ifdef GENERATED_TIMINGGAMEAPPLET_START_H\n    // RENDER USER CUSTOM START SCREEN (128x64)\n    display.drawBitmap(0, 0, TimingGameApplet_start_bmp,\n                       TIMINGGAMEAPPLET_START_WIDTH, TIMINGGAMEAPPLET_START_HEIGHT,\n                       SSD1306_WHITE);\n#else\n    // Fallback: Rajdhani text layout\n    ThemeFonts::drawCentered(&Rajdhani24pt7b, \"JUST TEN\", 16);\n    ThemeFonts::drawCentered(&Rajdhani12pt7b, \"Hold the button\", 44);\n    ThemeFonts::drawCentered(&Rajdhani12pt7b, \"for 10 seconds\", 56);\n#endif\n}\n\nvoid TimingGameApplet::drawCounting(uint32_t nowMs) const {\n    // Slower, smooth breathing animation (~2.8s per cycle)\n    const float breath = 0.5f + 0.5f * sinf(static_cast<float>(nowMs) * 0.0022f);\n    const int16_t outerRadius = static_cast<int16_t>(7.0f + breath * 15.0f);\n    const int16_t innerRadius = static_cast<int16_t>(outerRadius / 2);\n\n    display.drawCircle(64, 32, outerRadius, SSD1306_WHITE);\n    if (innerRadius > 1) {\n        display.drawCircle(64, 32, innerRadius, SSD1306_WHITE);\n    }\n    display.drawPixel(64, 32, SSD1306_WHITE);\n}\n\nvoid TimingGameApplet::drawResult() const {\n    char line[24];\n    formatSeconds4(holdDurationUs, line, sizeof(line));\n\n    const int64_t targetUs = 10000000LL;\n    char devLine[24];\n    formatDeviation4(static_cast<int64_t>(holdDurationUs) - targetUs, devLine, sizeof(devLine));\n\n#ifdef GENERATED_TIMINGGAMEAPPLET_END_H\n    // RENDER USER CUSTOM END SCREEN (128x64)\n    display.drawBitmap(0, 0, TimingGameApplet_end_bmp,\n                       TIMINGGAMEAPPLET_END_WIDTH, TIMINGGAMEAPPLET_END_HEIGHT,\n                       SSD1306_WHITE);\n\n    // Overlay dynamic score values on top of custom design\n    display.setTextSize(1);\n    display.setTextColor(SSD1306_WHITE);\n    display.setCursor(26, 28);\n    display.print(line);\n    display.setCursor(26, 40);\n    display.print(devLine);\n#else\n    // Fallback: Rajdhani text layout\n    ThemeFonts::drawCenteredBestFit(&Rajdhani32pt7b, &Rajdhani24pt7b, line, 20, 124);\n    ThemeFonts::drawCenteredBestFit(&Rajdhani18pt7b, &Rajdhani12pt7b, devLine, 52, 124);\n#endif\n}\n\nvoid TimingGameApplet::update() {\n    const uint32_t now = millis();\n    const bool pressing = isActionPressed();\n\n    if (state == IDLE && pressing && !wasPressing) {\n        state = COUNTING;\n        holdStartUs = micros();\n        SoundFX::playJustTenStart();\n    } else if (state == COUNTING && wasPressing && !pressing) {\n        holdDurationUs = micros() - holdStartUs;\n        state = RESULT;\n        resultDisplayTime = now;\n\n        int64_t diff = std::abs(static_cast<int64_t>(holdDurationUs) - 10000000LL);\n        // 5% of 10s is 0.5000s = 500,000 µs (range: 9.5000s to 10.5000s)\n        bool within5Percent = (diff <= 500000LL);\n\n        if (within5Percent) {\n            // Victory celebration fanfare and dual-LED rainbow party (brief 0.5s burst)\n            SoundFX::playCelebrationFanfare();\n            WS2812Driver::startCelebration(500);\n        } else {\n            // Action button released completion sound and warm amber flash (brief 0.5s burst)\n            SoundFX::playJustTenRelease();\n            WS2812Driver::flash(255, 120, 0, 500);\n        }\n\n        if (holdDurationUs > 0) {\n            int64_t currentDiff = diff;\n            int64_t bestDiff = (bestTimeUs == 0) ? -1 : std::abs(static_cast<int64_t>(bestTimeUs) - 10000000LL);\n            if (bestTimeUs == 0 || currentDiff < bestDiff) {\n                bestTimeUs = static_cast<uint32_t>(holdDurationUs);\n                prefs.begin(\"click_stats\", false);\n                prefs.putUInt(\"just_ten_time\", bestTimeUs);\n                prefs.end();\n            }\n        }\n    }\n\n    wasPressing = pressing;\n\n    if (state == RESULT && (now - resultDisplayTime) > 3500) {\n        state = IDLE;\n        WS2812Driver::clear();\n    }\n}\n\nvoid TimingGameApplet::draw() {\n    display.clearDisplay();\n\n    switch (state) {\n        case IDLE:\n            drawIdle();\n            break;\n        case COUNTING:\n            drawCounting(millis());\n            break;\n        case RESULT:\n            drawResult();\n            break;\n    }\n\n    display.display();\n}\n\nvoid TimingGameApplet::cleanup() {\n    state = IDLE;\n    wasPressing = false;\n    WS2812Driver::clear();\n    SoundFX::stop();\n}\n\nvoid TimingGameApplet::onActionClick() {\n    if (state == RESULT) {\n        state = IDLE;\n        WS2812Driver::clear();\n        SoundFX::stop();\n    }\n}\n\nvoid TimingGameApplet::onBothHeld() {\n    state = IDLE;\n    wasPressing = false;\n    WS2812Driver::clear();\n    SoundFX::stop();\n}\n",
    "jsCompanion": "class TimingGameApplet {\n  constructor() {\n    this.init();\n  }\n  init() {\n    this.state = 0; // 0: IDLE, 1: COUNTING, 2: RESULT\n    this.holdStartMs = 0;\n    this.durationMs = 0;\n    this.resultTime = 0;\n    this.bestScore = \"9.9998s\"; // Real hardware record (Praj: 9.9998s)\n    this.isPressing = false;\n    this.timeLine = \"\";\n    this.devLine = \"\";\n  }\n  update(dt, input) {\n    const now = performance.now();\n    const pressing = input && (input.actionPressed || input.isActionPressed);\n\n    if (this.state === 0 && pressing && !this.isPressing) {\n      // Initiate counting\n      this.state = 1;\n      this.holdStartMs = now;\n      if (input && input.sound) input.sound.playJustTenStart();\n      if (input && input.leds) {\n        input.leds.set(0, 0, 180, 255);\n        input.leds.set(1, 0, 180, 255);\n      }\n    } else if (this.state === 1 && !pressing && this.isPressing) {\n      // Released!\n      this.durationMs = now - this.holdStartMs;\n      this.state = 2;\n      this.resultTime = now;\n\n      // Exact 4-decimal formatting matching firmware\n      const totalSec = Math.floor(this.durationMs / 1000);\n      const frac = Math.floor((this.durationMs % 1000) * 10);\n      this.timeLine = `${totalSec}.${String(frac).padStart(4, '0')}s`;\n\n      const diffMs = this.durationMs - 10000;\n      const sign = diffMs >= 0 ? '+' : '-';\n      const absDiff = Math.abs(diffMs);\n      const devSec = Math.floor(absDiff / 1000);\n      const devFrac = Math.floor((absDiff % 1000) * 10);\n      this.devLine = `${sign}${devSec}.${String(devFrac).padStart(4, '0')}s`;\n\n      // Within 5% (500ms = 9.5s to 10.5s)?\n      const within5Percent = absDiff <= 500;\n      if (within5Percent) {\n        if (input && input.sound) input.sound.playCelebrationFanfare();\n        if (input && input.leds) input.leds.celebrate(1500);\n      } else {\n        if (input && input.sound) input.sound.playJustTenRelease();\n        if (input && input.leds) input.leds.flash(255, 120, 0, 500);\n      }\n    }\n\n    this.isPressing = pressing;\n\n    // Auto reset after 3500ms\n    if (this.state === 2 && now - this.resultTime > 3500) {\n      this.state = 0;\n      if (input && input.leds) input.leds.clear();\n    }\n  }\n  draw(display) {\n    display.clear();\n    const now = performance.now();\n\n    if (this.state === 0) {\n      // IDLE Title Card\n      if (typeof JUST_TEN_START_BMP !== 'undefined') {\n        display.drawBitmap(0, 0, JUST_TEN_START_BMP, 128, 64, 1);\n      } else {\n        display.drawText(\"JUST TEN\", 36, 16, 1);\n        display.drawText(\"Hold for 10 seconds\", 10, 36, 1);\n      }\n    } else if (this.state === 1) {\n      // COUNTING: Smooth breathing circle animation\n      const breath = 0.5 + 0.5 * Math.sin(now * 0.0022);\n      const outerR = Math.round(7.0 + breath * 15.0);\n      const innerR = Math.floor(outerR / 2);\n\n      display.drawCircle(64, 32, outerR, false, 1);\n      if (innerR > 1) {\n        display.drawCircle(64, 32, innerR, false, 1);\n      }\n      display.drawPixel(64, 32, 1);\n    } else if (this.state === 2) {\n      // RESULT: Prominently show precision 4-decimal time & deviation\n      display.drawText(\"JUST TEN\", 40, 8, 1);\n      display.drawText(this.timeLine, 36, 24, 1);\n      display.drawText(\"DEV: \" + this.devLine, 28, 38, 1);\n      display.drawText(\"RECORD: \" + this.bestScore, 14, 52, 1);\n    }\n  }\n  onActionClick(env) {\n    if (this.state === 2) {\n      this.state = 0;\n      if (env && env.sound) env.sound.stop();\n      if (env && env.leds) env.leds.clear();\n    }\n  }\n  onBothHeld(env) {\n    this.state = 0;\n    if (env && env.sound) env.sound.stop();\n    if (env && env.leds) env.leds.clear();\n  }\n}"
  },
  {
    "title": "Snowfall Screensaver",
    "slug": "snow-screensaver",
    "version": "v1.0.0",
    "category": "Clock",
    "iconType": "clock",
    "author": "Prajjwal",
    "description": "The official ambient screensaver from Click OS firmware. 48 individual drifting snowflakes driven by gentle wind physics that accumulate into dynamic organic snow drifts on the ground.",
    "tags": [
      "screensaver",
      "ambient",
      "clock",
      "physics",
      "firmware"
    ],
    "status": "approved",
    "featured": false,
    "likes": 92,
    "downloads": 710,
    "githubUrl": "https://github.com/prajjwalprajjwal/Click/tree/main/firmware/src/applets/screensaver",
    "instructions": "Ambient dynamic snowflake simulation. Flakes drift with realistic wind physics and accumulate on the ground. Tap ACTION to stir up a flurry gust. Tap MODE to toggle wind direction.",
    "cppHeader": "#ifndef HOME_APPLET_H\n#define HOME_APPLET_H\n\n#include <stdint.h>\n#include \"Applet.h\"\n\nclass HomeApplet : public Applet {\nprivate:\n    static const uint8_t FLAKE_COUNT = 48;\n    static const uint8_t SCREEN_W = 128;\n    static const uint8_t MAX_SNOW_HEIGHT = 4;\n\n    struct Snowflake {\n        float x;\n        float y;\n        float vx;\n        float vy;\n    };\n\n    Snowflake flakes[FLAKE_COUNT];\n    uint8_t snowDepth[SCREEN_W] = {0};\n    uint32_t unlockFlags = 0;\n\n    void initGround();\n    void initSnowflakes();\n    void respawnFlake(Snowflake& flake);\n    int16_t surfaceY(int16_t x) const;\n    void depositSnow(int16_t x);\n    void updateSnowflakes();\n    void drawGround() const;\n    void drawSnowflakes() const;\n    void drawUnlockElements();\n    void drawPatternSymbol(int16_t cx, int16_t cy, uint8_t scale) const;\n\npublic:\n    void init() override;\n    void update() override;\n    void draw() override;\n\n    void applyUnlockState(uint32_t unlockFlags);\n};\n\n#endif // HOME_APPLET_H\n",
    "cppSource": "#include \"HomeApplet.h\"\n#include <Arduino.h>\n#include <cstring>\n#include \"Display.h\"\n\nvoid HomeApplet::applyUnlockState(uint32_t flags) {\n    unlockFlags = flags;\n}\n\nvoid HomeApplet::initGround() {\n    memset(snowDepth, 0, sizeof(snowDepth));\n}\n\nvoid HomeApplet::respawnFlake(Snowflake& flake) {\n    flake.x = static_cast<float>(random(0, SCREEN_W));\n    flake.y = static_cast<float>(random(-12, -1));\n    flake.vy = static_cast<float>(random(80, 180)) / 100.0f;\n    flake.vx = static_cast<float>(random(-25, 25)) / 100.0f;\n}\n\nvoid HomeApplet::initSnowflakes() {\n    for (uint8_t i = 0; i < FLAKE_COUNT; i++) {\n        respawnFlake(flakes[i]);\n        flakes[i].y = static_cast<float>(random(-12, 50));\n    }\n}\n\nint16_t HomeApplet::surfaceY(int16_t x) const {\n    if (x < 0) {\n        x = 0;\n    } else if (x >= SCREEN_W) {\n        x = SCREEN_W - 1;\n    }\n    uint8_t pile = snowDepth[x];\n    if (pile > MAX_SNOW_HEIGHT) {\n        pile = MAX_SNOW_HEIGHT;\n    }\n    return static_cast<int16_t>(63 - pile);\n}\n\nvoid HomeApplet::depositSnow(int16_t x) {\n    if (x < 0 || x >= SCREEN_W) {\n        return;\n    }\n    if (snowDepth[x] < MAX_SNOW_HEIGHT) {\n        snowDepth[x]++;\n    }\n}\n\nvoid HomeApplet::updateSnowflakes() {\n    const float speedBoost = (unlockFlags & 0x08) ? 1.25f : 1.0f;\n\n    for (uint8_t i = 0; i < FLAKE_COUNT; i++) {\n        Snowflake& f = flakes[i];\n        f.x += f.vx;\n        f.y += f.vy * speedBoost;\n\n        if (f.x < 0.0f) {\n            f.x += SCREEN_W;\n        } else if (f.x >= SCREEN_W) {\n            f.x -= SCREEN_W;\n        }\n\n        const int16_t ix = static_cast<int16_t>(f.x);\n        if (f.y >= static_cast<float>(surfaceY(ix))) {\n            depositSnow(ix);\n            respawnFlake(f);\n        }\n    }\n}\n\nvoid HomeApplet::drawGround() const {\n    for (uint8_t x = 0; x < SCREEN_W; x++) {\n        uint8_t pile = snowDepth[x];\n        if (pile > 0) {\n            display.drawFastVLine(x, static_cast<int16_t>(64 - pile), pile, SSD1306_WHITE);\n        }\n    }\n}\n\nvoid HomeApplet::drawSnowflakes() const {\n    for (uint8_t i = 0; i < FLAKE_COUNT; i++) {\n        const Snowflake& f = flakes[i];\n        if (f.y >= 0.0f && f.y <= 63.0f) {\n            display.drawPixel(static_cast<int16_t>(f.x), static_cast<int16_t>(f.y), SSD1306_WHITE);\n        }\n    }\n}\n\nvoid HomeApplet::drawPatternSymbol(int16_t cx, int16_t cy, uint8_t scale) const {\n    const int8_t points[][2] = {{0, -3}, {3, 0}, {0, 3}, {-3, 0}};\n    for (uint8_t i = 0; i < 4; i++) {\n        int16_t x1 = cx + points[i][0] * scale;\n        int16_t y1 = cy + points[i][1] * scale;\n        int16_t x2 = cx + points[(i + 1) % 4][0] * scale;\n        int16_t y2 = cy + points[(i + 1) % 4][1] * scale;\n        display.drawLine(x1, y1, x2, y2, SSD1306_WHITE);\n    }\n    display.fillRect(cx - 1, cy - 1, 3, 3, SSD1306_WHITE);\n}\n\nvoid HomeApplet::drawUnlockElements() {\n    // Disabled: static unlock markers appear as frozen/dead pixels on the OLED display\n}\n\nvoid HomeApplet::init() {\n    initGround();\n    initSnowflakes();\n}\n\nvoid HomeApplet::update() {\n    updateSnowflakes();\n}\n\nvoid HomeApplet::draw() {\n    display.clearDisplay();\n    drawGround();\n    drawSnowflakes();\n    drawUnlockElements();\n    display.display();\n}\n",
    "jsCompanion": "class HomeApplet {\n  constructor() {\n    this.init();\n  }\n  init() {\n    this.flakeCount = 48;\n    this.flakes = [];\n    this.snowDepth = new Uint8Array(128);\n    this.wind = 0.0;\n    this.targetWind = 0.0;\n    this.lastGustMs = performance.now();\n\n    for (let i = 0; i < this.flakeCount; i++) {\n      this.flakes.push({\n        x: Math.random() * 128,\n        y: Math.random() * 64,\n        vy: 0.6 + Math.random() * 0.8,\n        vx: (Math.random() - 0.5) * 0.4\n      });\n    }\n  }\n  update(dt, input) {\n    const factor = Math.min(2.0, dt / 16);\n    const now = performance.now();\n\n    if (now - this.lastGustMs > 3000) {\n      this.targetWind = (Math.random() - 0.5) * 0.6;\n      this.lastGustMs = now;\n    }\n    this.wind += (this.targetWind - this.wind) * 0.02 * factor;\n\n    for (const f of this.flakes) {\n      f.x += (f.vx + this.wind) * factor;\n      f.y += f.vy * factor;\n\n      if (f.x < 0) f.x += 128;\n      if (f.x >= 128) f.x -= 128;\n\n      const ix = Math.floor(f.x);\n      const groundY = 63 - (this.snowDepth[ix] || 0);\n\n      if (f.y >= groundY) {\n        if (this.snowDepth[ix] < 6) {\n          this.snowDepth[ix]++;\n        }\n        f.y = -Math.random() * 10;\n        f.x = Math.random() * 128;\n        f.vy = 0.6 + Math.random() * 0.8;\n      }\n    }\n  }\n  draw(display) {\n    display.clear();\n\n    const now = new Date();\n    const hh = String(now.getHours()).padStart(2, '0');\n    const mm = String(now.getMinutes()).padStart(2, '0');\n    display.drawText(hh + \":\" + mm, 44, 24, 2);\n    display.drawText(\"SNOWFALL OS\", 32, 10, 1);\n\n    for (let x = 0; x < 128; x++) {\n      const depth = this.snowDepth[x];\n      if (depth > 0) {\n        display.drawFastVLine(x, 64 - depth, depth, 1);\n      }\n    }\n\n    for (const f of this.flakes) {\n      if (f.y >= 0 && f.y < 64) {\n        display.drawPixel(f.x, f.y, 1);\n      }\n    }\n  }\n  onActionClick(env) {\n    this.wind = (Math.random() > 0.5 ? 1 : -1) * 1.5;\n    env.sound.playTone(1760, 60);\n    env.leds.flash(200, 240, 255, 100);\n  }\n  onModeClick(env) {\n    this.snowDepth.fill(0);\n    env.sound.playTone(1318, 40);\n  }\n}"
  },
  {
    "title": "System & Battery Monitor",
    "slug": "system-settings",
    "version": "v1.0.4",
    "category": "Tools",
    "iconType": "cpu",
    "author": "Prajjwal",
    "description": "The official Click settings and hardware telemetry applet from Click OS. Inspects battery voltage, charge state, LiPo capacity, firmware version, and RP2354A MCU clock rates.",
    "tags": [
      "tools",
      "system",
      "battery",
      "hardware",
      "telemetry",
      "firmware"
    ],
    "status": "approved",
    "featured": false,
    "likes": 88,
    "downloads": 640,
    "githubUrl": "https://github.com/prajjwalprajjwal/Click/tree/main/firmware/src/applets/settings",
    "instructions": "Tap ACTION to toggle between Battery Diagnostics and System Info. Tap MODE to simulate USB charger connection.",
    "cppHeader": "#ifndef SETTINGS_APPLET_H\n#define SETTINGS_APPLET_H\n\n#include \"Applet.h\"\n#include \"Display.h\"\n#include \"battery.hpp\"\n#include \"device_info.hpp\"\n#include \"fonts/ThemeFonts.h\"\n\nclass SettingsApplet : public Applet {\nprivate:\n    uint8_t subPage = 0; // 0: Power & Battery, 1: System Info\n\npublic:\n    void init() override {\n        subPage = 0;\n        BatteryManager::init();\n    }\n\n    void update() override {}\n\n    void draw() override {\n        display.clearDisplay();\n\n        if (subPage == 0) {\n            drawBatteryPage();\n        } else {\n            drawAboutPage();\n        }\n\n        display.display();\n    }\n\nprivate:\n    void drawBatteryPage() {\n        // Sub-page 0: Battery & Power Stats\n        ThemeFonts::drawCentered(&Rajdhani18pt7b, \"SYSTEM\", 16);\n\n        int pct = BatteryManager::getPercentage();\n        bool charging = BatteryManager::isCharging();\n        float voltage = BatteryManager::getSmoothVoltage();\n\n        char buf[32];\n        if (charging) {\n            snprintf(buf, sizeof(buf), \"Bat: %d%% [CHARGING]\", pct);\n        } else if (pct >= 99 && voltage >= 4.12f) {\n            snprintf(buf, sizeof(buf), \"Bat: 100%% [CHARGED]\");\n        } else {\n            snprintf(buf, sizeof(buf), \"Bat: %d%% [BATTERY]\", pct);\n        }\n        ThemeFonts::drawCentered(&Rajdhani12pt7b, buf, 34);\n\n        int vWhole = (int)voltage;\n        int vFrac = (int)(voltage * 100.0f + 0.5f) % 100;\n        if (vWhole < 0) vWhole = 0;\n        if (vFrac < 0) vFrac = 0;\n        snprintf(buf, sizeof(buf), \"%d.%02dV\", vWhole, vFrac);\n        ThemeFonts::drawCentered(&Rajdhani12pt7b, buf, 48);\n\n        // Visual battery bar\n        display.drawRect(20, 54, 88, 7, SSD1306_WHITE);\n        int barW = (pct * 84) / 100;\n        if (barW > 84) barW = 84;\n        if (barW > 0) {\n            display.fillRect(22, 56, barW, 3, SSD1306_WHITE);\n        }\n    }\n\n    void drawAboutPage() {\n        // Sub-page 1: System / Hardware Info (Rajdhani Theme)\n        ThemeFonts::drawCentered(&Rajdhani18pt7b, \"SYSTEM INFO\", 16);\n\n        String serialStr = DeviceInfo::getID();\n\n        char buf[32];\n        snprintf(buf, sizeof(buf), \"FW: v1.0.4\");\n        ThemeFonts::drawCentered(&Rajdhani12pt7b, buf, 32);\n\n        snprintf(buf, sizeof(buf), \"ID: %s\", serialStr.c_str());\n        ThemeFonts::drawCentered(&Rajdhani12pt7b, buf, 44);\n\n        snprintf(buf, sizeof(buf), \"MCU: RP2354A (48MHz)\");\n        ThemeFonts::drawCentered(&Rajdhani12pt7b, buf, 56);\n    }\n\npublic:\n    void onActionClick() override {\n        // Pressing ACTION toggles between Battery and About screens\n        subPage = (subPage == 0) ? 1 : 0;\n    }\n\n    void onActionHold() override {}\n    void onModeClick() override {}\n    void onModeHold() override {}\n    void onBothHeld() override {}\n};\n\n#endif // SETTINGS_APPLET_H\n",
    "cppSource": "// SettingsApplet is a header-only applet in Click OS firmware\\n#include \"SettingsApplet.h\"\\n",
    "jsCompanion": "class SettingsApplet {\n  constructor() {\n    this.init();\n  }\n  init() {\n    this.subPage = 0;\n    this.charging = false;\n    this.voltage = 3.92;\n    this.pct = 88;\n  }\n  update(dt, input) {\n    if (this.charging) {\n      input.leds.startBreathe(0, 200, 100, 1500);\n    }\n  }\n  draw(display) {\n    display.clear();\n\n    if (this.subPage === 0) {\n      display.drawText(\"SYSTEM\", 44, 4, 1);\n\n      const status = this.charging ? \"Bat: \" + this.pct + \"% [CHARGING]\" : \"Bat: \" + this.pct + \"% [BATTERY]\";\n      display.drawText(status, 14, 20, 1);\n\n      const voltStr = this.voltage.toFixed(2) + \"V  (3.7V LiPo)\";\n      display.drawText(voltStr, 14, 32, 1);\n\n      display.drawRect(20, 46, 84, 8, false);\n      display.drawRect(104, 48, 3, 4, true);\n\n      const fillW = Math.round((this.pct / 100) * 80);\n      display.fillRect(22, 48, fillW, 4, 1);\n\n      display.drawText(\"ACTION: Next Page\", 14, 56, 1);\n    } else {\n      display.drawText(\"SYSTEM INFO\", 32, 4, 1);\n      display.drawText(\"FW: v1.0.4 Click OS\", 10, 18, 1);\n      display.drawText(\"ID: CLICK-RP2354-9A4B\", 6, 29, 1);\n      display.drawText(\"MCU: RP2354A (150MHz)\", 6, 40, 1);\n      display.drawText(\"Flash: 4.0 MB QSPI\", 12, 51, 1);\n    }\n  }\n  onActionClick(env) {\n    this.subPage = this.subPage === 0 ? 1 : 0;\n    env.sound.playClick();\n  }\n  onModeClick(env) {\n    this.charging = !this.charging;\n    env.sound.playTone(1046, 50);\n    if (!this.charging) env.leds.clear();\n  }\n}"
  },
  {
    "title": "Pomodoro Pulse Focus",
    "slug": "pomodoro-pulse",
    "version": "v1.3.0",
    "category": "Clock",
    "iconType": "clock",
    "author": "Studio Labs",
    "description": "Haptic desk focus companion. Clean 25m Deep Focus / 5m Rest Break timer with smooth WS2812 breathing LED glow and audible phase completion fanfare.",
    "tags": [
      "productivity",
      "utility",
      "focus",
      "timer"
    ],
    "status": "approved",
    "featured": false,
    "likes": 74,
    "downloads": 512,
    "githubUrl": "https://github.com/prajjwalprajjwal/Click",
    "instructions": "ACTION toggles Start/Pause countdown. MODE switches between 25m Focus and 5m Break.",
    "cppHeader": "#pragma once\\n#include \"Applet.h\"\\n\\nclass PomodoroApplet : public Applet {\\nprivate:\\n    bool running = false;\\n    bool isBreak = false;\\n    uint32_t remainingSec = 1500;\\npublic:\\n    void init() override;\\n    void update() override;\\n    void draw() override;\\n    void onActionClick() override;\\n    void onModeClick() override;\\n};",
    "cppSource": "#include \"PomodoroApplet.h\"\\n#include \"Display.h\"\\n#include \"system/SoundFX.h\"\\n#include \"system/WS2812.h\"\\n\\nvoid PomodoroApplet::init() {\\n    running = false;\\n    isBreak = false;\\n    remainingSec = 1500;\\n    WS2812Driver::clear();\\n}\\nvoid PomodoroApplet::update() {}\\nvoid PomodoroApplet::draw() {\\n    display.clearDisplay();\\n    display.setCursor(4, 4);\\n    display.print(\"[POMODORO]\");\\n}\\nvoid PomodoroApplet::onActionClick() {\\n    running = !running;\\n    SoundFX::playClick();\\n}\\nvoid PomodoroApplet::onModeClick() {\\n    isBreak = !isBreak;\\n    remainingSec = isBreak ? 300 : 1500;\\n}",
    "jsCompanion": "class PomodoroApplet {\n  constructor() {\n    this.init();\n  }\n  init() {\n    this.running = false;\n    this.isBreak = false;\n    this.remainingSec = 25 * 60;\n    this.totalSec = 25 * 60;\n    this.lastSecMs = performance.now();\n  }\n  update(dt, input) {\n    if (this.running) {\n      const now = performance.now();\n      if (now - this.lastSecMs >= 1000) {\n        this.lastSecMs = now;\n        if (this.remainingSec > 0) {\n          this.remainingSec--;\n        } else {\n          this.running = false;\n          input.sound.playCelebrationFanfare();\n          input.leds.celebrate(2000);\n        }\n      }\n      const t = ((now % 3000) / 3000) * Math.PI * 2;\n      const b = Math.floor(60 + 50 * Math.sin(t));\n      if (this.isBreak) {\n        input.leds.set(0, 0, b * 2, 80);\n        input.leds.set(1, 0, b * 2, 80);\n      } else {\n        input.leds.set(0, 0, 120, b * 2);\n        input.leds.set(1, 0, 120, b * 2);\n      }\n    }\n  }\n  draw(display) {\n    display.clear();\n    const modeStr = this.isBreak ? \"BREAK TIME\" : \"DEEP FOCUS\";\n    display.drawText(modeStr, 30, 4, 1);\n\n    const m = Math.floor(this.remainingSec / 60);\n    const s = this.remainingSec % 60;\n    const timeStr = (m < 10 ? \"0\" + m : m) + \":\" + (s < 10 ? \"0\" + s : s);\n    display.drawText(timeStr, 28, 20, 2);\n\n    const status = this.running ? \"RUNNING...\" : \"PAUSED (ACTION)\";\n    display.drawText(status, 24, 42, 1);\n\n    const progress = 1 - this.remainingSec / this.totalSec;\n    display.drawRect(12, 54, 104, 5, false);\n    display.fillRect(12, 54, Math.round(104 * progress), 5, 1);\n  }\n  onActionClick(env) {\n    this.running = !this.running;\n    this.lastSecMs = performance.now();\n    env.sound.playClick();\n    if (!this.running) env.leds.clear();\n  }\n  onModeClick(env) {\n    this.isBreak = !this.isBreak;\n    this.totalSec = this.isBreak ? 5 * 60 : 25 * 60;\n    this.remainingSec = this.totalSec;\n    this.running = false;\n    env.sound.playTone(1600, 60);\n    env.leds.clear();\n  }\n}"
  }
];

  const upsert = db.prepare(`
    INSERT INTO applets (
      id, title, slug, version, category, iconType, author, description, tags, status,
      cppHeader, cppSource, jsCompanion, instructions, githubUrl,
      likes, downloads, featured, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      version = excluded.version,
      category = excluded.category,
      iconType = excluded.iconType,
      author = excluded.author,
      description = excluded.description,
      tags = excluded.tags,
      status = excluded.status,
      cppHeader = excluded.cppHeader,
      cppSource = excluded.cppSource,
      jsCompanion = excluded.jsCompanion,
      instructions = excluded.instructions,
      githubUrl = excluded.githubUrl,
      likes = excluded.likes,
      downloads = excluded.downloads,
      featured = excluded.featured,
      updatedAt = excluded.updatedAt
  `);

  try {
    db.exec("DELETE FROM applets WHERE slug IN ('space-dodger', 'cyber-synth', 'i2c-inspector')");
  } catch (e) {}

  const now = new Date().toISOString();
  for (const s of seeds) {
    const id = 'seed_' + s.slug;
    upsert.run(
      id,
      s.title,
      s.slug,
      s.version,
      s.category,
      s.iconType,
      s.author,
      s.description,
      JSON.stringify(s.tags),
      s.status,
      s.cppHeader,
      s.cppSource,
      s.jsCompanion,
      s.instructions,
      s.githubUrl || null,
      s.likes,
      s.downloads,
      s.featured ? 1 : 0,
      now,
      now
    );
  }
}

function parseAppletRow(row: any): AppletRecord {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    featured: Boolean(row.featured)
  };
}

export function getApprovedApplets(options?: {
  category?: string;
  tag?: string;
  search?: string;
  sort?: 'popular' | 'newest' | 'alpha';
}): AppletRecord[] {
  const db = getDb();
  let query = "SELECT * FROM applets WHERE status = 'approved'";
  const params: any[] = [];

  if (options?.category && options.category !== 'All') {
    query += " AND category = ?";
    params.push(options.category);
  }

  if (options?.search) {
    query += " AND (title LIKE ? OR description LIKE ? OR author LIKE ? OR tags LIKE ?)";
    const term = '%' + options.search + '%';
    params.push(term, term, term, term);
  }

  if (options?.sort === 'alpha') {
    query += " ORDER BY title ASC";
  } else if (options?.sort === 'newest') {
    query += " ORDER BY createdAt DESC";
  } else {
    query += " ORDER BY featured DESC, downloads DESC, likes DESC";
  }

  const rows = db.prepare(query).all(...params) as any[];
  const parsed = rows.map(parseAppletRow);

  if (options?.tag) {
    return parsed.filter(app => app.tags.includes(options.tag!));
  }

  return parsed;
}

export function getAppletBySlug(slug: string): AppletRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM applets WHERE slug = ?').get(slug);
  return row ? parseAppletRow(row) : null;
}

export function getAppletById(id: string): AppletRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM applets WHERE id = ?').get(id);
  return row ? parseAppletRow(row) : null;
}

export function getAllAppletsForAdmin(secretKey?: string): AppletRecord[] {
  const expectedSecret = process.env.ADMIN_SECRET_KEY || 'click_admin_secret_2026';
  if (!secretKey || secretKey !== expectedSecret) {
    throw new Error('Unauthorized: Invalid admin secret key');
  }

  const db = getDb();
  const rows = db.prepare('SELECT * FROM applets ORDER BY createdAt DESC').all() as any[];
  return rows.map(parseAppletRow);
}

export function submitAppletForReview(data: {
  title: string;
  author: string;
  description: string;
  tags: string[];
  cppHeader: string;
  cppSource: string;
  jsCompanion: string;
  instructions: string;
  category?: AppCategory;
  iconType?: string;
  githubUrl?: string;
}): AppletRecord {
  const db = getDb();
  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const existing = db.prepare('SELECT id FROM applets WHERE slug = ?').get(slug);
  if (existing) {
    throw new Error(`An applet with the title "${data.title}" already exists.`);
  }

  const id = 'app_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO applets (
      id, title, slug, version, category, iconType, author, description, tags, status,
      cppHeader, cppSource, jsCompanion, instructions, githubUrl,
      likes, downloads, featured, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `).run(
    id,
    data.title,
    slug,
    'v1.0.0',
    data.category || 'Games',
    data.iconType || 'gamepad',
    data.author,
    data.description,
    JSON.stringify(data.tags),
    'pending_review',
    data.cppHeader,
    data.cppSource,
    data.jsCompanion,
    data.instructions,
    data.githubUrl || null,
    0,
    0,
    0,
    now,
    now
  );

  return getAppletById(id)!;
}

export function updateAppletStatus(
  id: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string,
  secretKey?: string
): AppletRecord {
  const expectedSecret = process.env.ADMIN_SECRET_KEY || 'click_admin_secret_2026';
  if (!secretKey || secretKey !== expectedSecret) {
    throw new Error('Unauthorized: Invalid admin secret key');
  }

  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE applets 
    SET status = ?, rejectionReason = ?, updatedAt = ?
    WHERE id = ?
  `).run(status, rejectionReason || null, now, id);

  const updated = getAppletById(id);
  if (!updated) throw new Error('Applet not found');
  return updated;
}

export function incrementAppletLikes(id: string): number {
  const db = getDb();
  db.prepare('UPDATE applets SET likes = likes + 1 WHERE id = ?').run(id);
  const row = db.prepare('SELECT likes FROM applets WHERE id = ?').get(id) as { likes: number };
  return row ? row.likes : 0;
}

export const toggleAppletLike = incrementAppletLikes;
export const createAppletSubmission = submitAppletForReview;

export function incrementAppletDownloads(id: string): number {
  const db = getDb();
  db.prepare('UPDATE applets SET downloads = downloads + 1 WHERE id = ?').run(id);
  const row = db.prepare('SELECT downloads FROM applets WHERE id = ?').get(id) as { downloads: number };
  return row ? row.downloads : 0;
}
