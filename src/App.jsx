import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Trophy, Users, Gavel, Play, Shield, Plus, LogIn, Copy, Check,
  Lock, Unlock, Trash2, UserMinus, Crown, Pause, SkipForward,
  RefreshCw, Download, Volume2, VolumeX, ArrowRight, ChevronLeft,
  Award, BarChart2, History, User, Settings, AlertCircle, CheckCircle2,
  Zap, Target, Flame, Compass, Sparkles, Edit3, X
} from 'lucide-react';

// ============================================================================
// 1. WEB AUDIO API SOUND ENGINE (No external audio files required)
// ============================================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.4;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, delay = 0, volMult = 1) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

      const finalVol = Math.min(1, Math.max(0.01, this.volume * volMult));
      gain.gain.setValueAtTime(finalVol, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      // Ignore audio context restrictions before user gesture
    }
  }

  playNoise(duration = 0.25, volMult = 0.5) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.volume * volMult, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {}
  }

  bid() {
    this.playTone(587.33, 'triangle', 0.12, 0, 0.8);
    this.playTone(880, 'sine', 0.18, 0.08, 0.9);
  }

  tick() {
    this.playTone(900, 'sine', 0.05, 0, 0.3);
  }

  sold() {
    // Gavel slam + victory chord
    this.playTone(140, 'square', 0.18, 0, 1.0);
    this.playTone(523.25, 'triangle', 0.2, 0.15, 0.9);
    this.playTone(659.25, 'triangle', 0.2, 0.25, 0.9);
    this.playTone(783.99, 'triangle', 0.4, 0.35, 1.0);
  }

  unsold() {
    this.playTone(300, 'sawtooth', 0.25, 0, 0.7);
    this.playTone(220, 'sawtooth', 0.35, 0.18, 0.7);
  }

  batHit(power = 1) {
    this.playTone(180 + power * 80, 'triangle', 0.09, 0, 1.0);
    this.playNoise(0.08, 0.8);
  }

  four() {
    this.playTone(523.25, 'sine', 0.15, 0.05, 0.9);
    this.playTone(659.25, 'sine', 0.15, 0.15, 0.9);
    this.playTone(783.99, 'sine', 0.3, 0.25, 1.0);
    this.playNoise(0.4, 0.5);
  }

  six() {
    this.playTone(523.25, 'triangle', 0.15, 0.05, 1.0);
    this.playTone(659.25, 'triangle', 0.15, 0.14, 1.0);
    this.playTone(783.99, 'triangle', 0.15, 0.23, 1.0);
    this.playTone(1046.5, 'triangle', 0.45, 0.32, 1.1);
    this.playNoise(0.65, 0.7);
  }

  wicket() {
    this.playTone(150, 'sawtooth', 0.2, 0, 1.0);
    this.playTone(110, 'square', 0.35, 0.12, 1.0);
    this.playNoise(0.3, 0.6);
  }

  victory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 'triangle', 0.22, idx * 0.14, 1.0);
    });
  }
}

const sound = new SoundEngine();

// ============================================================================
// 2. DATA: ALL 10 IPL FRANCHISES & EXTENSIVE PLAYER DATABASE
// ============================================================================
const IPL_TEAMS = [
  { id: 'CSK', name: 'Chennai Super Kings', short: 'CSK', primary: '#F9CD05', secondary: '#0081E9', badge: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', short: 'MI', primary: '#004BA0', secondary: '#D1AB3E', badge: '🌀' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', short: 'RCB', primary: '#EC1C24', secondary: '#2B2A29', badge: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', short: 'KKR', primary: '#3A225D', secondary: '#B3A123', badge: '⚔️' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', short: 'SRH', primary: '#FF822A', secondary: '#000000', badge: '🦅' },
  { id: 'RR', name: 'Rajasthan Royals', short: 'RR', primary: '#EA1A85', secondary: '#254AA5', badge: '🏰' },
  { id: 'DC', name: 'Delhi Capitals', short: 'DC', primary: '#00008B', secondary: '#EF1B23', badge: '🐯' },
  { id: 'PBKS', name: 'Punjab Kings', short: 'PBKS', primary: '#ED1B24', secondary: '#DCDDDF', badge: '🛡️' },
  { id: 'GT', name: 'Gujarat Titans', short: 'GT', primary: '#1B2133', secondary: '#B3995D', badge: '⚡' },
  { id: 'LSG', name: 'Lucknow Super Giants', short: 'LSG', primary: '#0057E2', secondary: '#F26522', badge: '🦅' },
];

const INITIAL_PLAYERS = [
  // Marquee & Star Batters
  { id: 'P001', name: 'Virat Kohli', country: 'India', age: 37, role: 'Batter', batStyle: 'Right-hand', bowlStyle: 'Right-arm Medium', bat: 96, bowl: 25, field: 92, basePrice: 2.0, avatar: '🏏' },
  { id: 'P002', name: 'Rohit Sharma', country: 'India', age: 38, role: 'Batter', batStyle: 'Right-hand', bowlStyle: 'Right-arm Offbreak', bat: 94, bowl: 30, field: 84, basePrice: 2.0, avatar: '🔥' },
  { id: 'P003', name: 'Suryakumar Yadav', country: 'India', age: 35, role: 'Batter', batStyle: 'Right-hand', bowlStyle: 'Right-arm Medium', bat: 95, bowl: 20, field: 90, basePrice: 2.0, avatar: '💫' },
  { id: 'P004', name: 'Shubman Gill', country: 'India', age: 26, role: 'Batter', batStyle: 'Right-hand', bowlStyle: 'Right-arm Offbreak', bat: 92, bowl: 20, field: 89, basePrice: 2.0, avatar: '👑' },
  { id: 'P005', name: 'Yashasvi Jaiswal', country: 'India', age: 24, role: 'Batter', batStyle: 'Left-hand', bowlStyle: 'Legbreak', bat: 91, bowl: 25, field: 88, basePrice: 2.0, avatar: '⚡' },
  { id: 'P006', name: 'Travis Head', country: 'Australia', age: 32, role: 'Batter', batStyle: 'Left-hand', bowlStyle: 'Right-arm Offbreak', bat: 93, bowl: 45, field: 86, basePrice: 2.0, avatar: '🚀' },
  { id: 'P007', name: 'Ruturaj Gaikwad', country: 'India', age: 29, role: 'Batter', batStyle: 'Right-hand', bowlStyle: 'Right-arm Offbreak', bat: 89, bowl: 20, field: 88, basePrice: 1.5, avatar: '🦁' },
  { id: 'P008', name: 'Rinku Singh', country: 'India', age: 28, role: 'Batter', batStyle: 'Left-hand', bowlStyle: 'Right-arm Offbreak', bat: 88, bowl: 20, field: 94, basePrice: 1.5, avatar: '💥' },
  { id: 'P009', name: 'Abhishek Sharma', country: 'India', age: 25, role: 'Batter', batStyle: 'Left-hand', bowlStyle: 'Slow Left-arm', bat: 88, bowl: 55, field: 85, basePrice: 1.5, avatar: '🌟' },
  { id: 'P010', name: 'Faf du Plessis', country: 'South Africa', age: 41, role: 'Batter', batStyle: 'Right-hand', bowlStyle: 'Legbreak', bat: 87, bowl: 20, field: 95, basePrice: 1.5, avatar: '🛡️' },
  { id: 'P011', name: 'Tilak Varma', country: 'India', age: 23, role: 'Batter', batStyle: 'Left-hand', bowlStyle: 'Right-arm Offbreak', bat: 86, bowl: 40, field: 87, basePrice: 1.0, avatar: '🎯' },
  { id: 'P012', name: 'Sai Sudharsan', country: 'India', age: 24, role: 'Batter', batStyle: 'Left-hand', bowlStyle: 'Legbreak', bat: 86, bowl: 25, field: 84, basePrice: 1.0, avatar: '✨' },

  // Wicketkeepers
  { id: 'P013', name: 'MS Dhoni', country: 'India', age: 44, role: 'WK-Batter', batStyle: 'Right-hand', bowlStyle: 'Right-arm Medium', bat: 88, bowl: 25, field: 96, basePrice: 2.0, avatar: '🧤' },
  { id: 'P014', name: 'Rishabh Pant', country: 'India', age: 28, role: 'WK-Batter', batStyle: 'Left-hand', bowlStyle: 'None', bat: 92, bowl: 15, field: 90, basePrice: 2.0, avatar: '🦸' },
  { id: 'P015', name: 'Sanju Samson', country: 'India', age: 31, role: 'WK-Batter', batStyle: 'Right-hand', bowlStyle: 'None', bat: 90, bowl: 15, field: 89, basePrice: 2.0, avatar: '🏰' },
  { id: 'P016', name: 'Jos Buttler', country: 'England', age: 35, role: 'WK-Batter', batStyle: 'Right-hand', bowlStyle: 'None', bat: 94, bowl: 15, field: 91, basePrice: 2.0, avatar: '👑' },
  { id: 'P017', name: 'KL Rahul', country: 'India', age: 34, role: 'WK-Batter', batStyle: 'Right-hand', bowlStyle: 'None', bat: 91, bowl: 15, field: 88, basePrice: 2.0, avatar: '🎩' },
  { id: 'P018', name: 'Heinrich Klaasen', country: 'South Africa', age: 34, role: 'WK-Batter', batStyle: 'Right-hand', bowlStyle: 'Right-arm Offbreak', bat: 94, bowl: 20, field: 89, basePrice: 2.0, avatar: '💣' },
  { id: 'P019', name: 'Nicholas Pooran', country: 'West Indies', age: 30, role: 'WK-Batter', batStyle: 'Left-hand', bowlStyle: 'Right-arm Offbreak', bat: 92, bowl: 20, field: 91, basePrice: 2.0, avatar: '🌴' },
  { id: 'P020', name: 'Ishan Kishan', country: 'India', age: 27, role: 'WK-Batter', batStyle: 'Left-hand', bowlStyle: 'None', bat: 86, bowl: 15, field: 86, basePrice: 1.5, avatar: '⚡' },

  // All-Rounders
  { id: 'P021', name: 'Hardik Pandya', country: 'India', age: 32, role: 'All-Rounder', batStyle: 'Right-hand', bowlStyle: 'Right-arm Fast-Med', bat: 90, bowl: 86, field: 92, basePrice: 2.0, avatar: '💎' },
  { id: 'P022', name: 'Ravindra Jadeja', country: 'India', age: 37, role: 'All-Rounder', batStyle: 'Left-hand', bowlStyle: 'Slow Left-arm', bat: 85, bowl: 89, field: 98, basePrice: 2.0, avatar: '🗡️' },
  { id: 'P023', name: 'Andre Russell', country: 'West Indies', age: 38, role: 'All-Rounder', batStyle: 'Right-hand', bowlStyle: 'Right-arm Fast', bat: 93, bowl: 82, field: 87, basePrice: 2.0, avatar: '💪' },
  { id: 'P024', name: 'Sunil Narine', country: 'West Indies', age: 38, role: 'All-Rounder', batStyle: 'Left-hand', bowlStyle: 'Right-arm Offbreak', bat: 84, bowl: 93, field: 84, basePrice: 2.0, avatar: '🪄' },
  { id: 'P025', name: 'Axar Patel', country: 'India', age: 32, role: 'All-Rounder', batStyle: 'Left-hand', bowlStyle: 'Slow Left-arm', bat: 82, bowl: 88, field: 90, basePrice: 1.5, avatar: '🎯' },
  { id: 'P026', name: 'Glenn Maxwell', country: 'Australia', age: 37, role: 'All-Rounder', batStyle: 'Right-hand', bowlStyle: 'Right-arm Offbreak', bat: 90, bowl: 74, field: 94, basePrice: 2.0, avatar: '🌪️' },
  { id: 'P027', name: 'Liam Livingstone', country: 'England', age: 32, role: 'All-Rounder', batStyle: 'Right-hand', bowlStyle: 'Legbreak / Offbreak', bat: 87, bowl: 75, field: 88, basePrice: 1.5, avatar: '🔨' },
  { id: 'P028', name: 'Marcus Stoinis', country: 'Australia', age: 36, role: 'All-Rounder', batStyle: 'Right-hand', bowlStyle: 'Right-arm Medium', bat: 86, bowl: 78, field: 86, basePrice: 1.5, avatar: '🏋️' },
  { id: 'P029', name: 'Sam Curran', country: 'England', age: 27, role: 'All-Rounder', batStyle: 'Left-hand', bowlStyle: 'Left-arm Fast-Med', bat: 80, bowl: 84, field: 88, basePrice: 1.5, avatar: '🦁' },
  { id: 'P030', name: 'Shivam Dube', country: 'India', age: 32, role: 'All-Rounder', batStyle: 'Left-hand', bowlStyle: 'Right-arm Medium', bat: 88, bowl: 64, field: 80, basePrice: 1.5, avatar: '🚀' },
  { id: 'P031', name: 'Nitish Kumar Reddy', country: 'India', age: 23, role: 'All-Rounder', batStyle: 'Right-hand', bowlStyle: 'Right-arm Fast-Med', bat: 83, bowl: 76, field: 85, basePrice: 1.0, avatar: '🔥' },
  { id: 'P032', name: 'Washington Sundar', country: 'India', age: 26, role: 'All-Rounder', batStyle: 'Left-hand', bowlStyle: 'Right-arm Offbreak', bat: 76, bowl: 82, field: 85, basePrice: 1.0, avatar: '🌿' },

  // Fast Bowlers & Spinners
  { id: 'P033', name: 'Jasprit Bumrah', country: 'India', age: 32, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Right-arm Fast', bat: 32, bowl: 98, field: 88, basePrice: 2.0, avatar: '🎯' },
  { id: 'P034', name: 'Rashid Khan', country: 'Afghanistan', age: 27, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Legbreak Googly', bat: 72, bowl: 96, field: 93, basePrice: 2.0, avatar: '🌀' },
  { id: 'P035', name: 'Mitchell Starc', country: 'Australia', age: 36, role: 'Bowler', batStyle: 'Left-hand', bowlStyle: 'Left-arm Fast', bat: 52, bowl: 93, field: 84, basePrice: 2.0, avatar: '⚡' },
  { id: 'P036', name: 'Pat Cummins', country: 'Australia', age: 33, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Right-arm Fast', bat: 68, bowl: 92, field: 89, basePrice: 2.0, avatar: '🏆' },
  { id: 'P037', name: 'Trent Boult', country: 'New Zealand', age: 36, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Left-arm Fast-Med', bat: 42, bowl: 92, field: 88, basePrice: 2.0, avatar: '🏹' },
  { id: 'P038', name: 'Mohammed Shami', country: 'India', age: 35, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Right-arm Fast', bat: 40, bowl: 92, field: 82, basePrice: 2.0, avatar: '🔥' },
  { id: 'P039', name: 'Arshdeep Singh', country: 'India', age: 27, role: 'Bowler', batStyle: 'Left-hand', bowlStyle: 'Left-arm Fast-Med', bat: 35, bowl: 90, field: 84, basePrice: 2.0, avatar: '🦅' },
  { id: 'P040', name: 'Kuldeep Yadav', country: 'India', age: 31, role: 'Bowler', batStyle: 'Left-hand', bowlStyle: 'Left-arm Wrist Spin', bat: 42, bowl: 91, field: 83, basePrice: 2.0, avatar: '🔮' },
  { id: 'P041', name: 'Yuzvendra Chahal', country: 'India', age: 35, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Legbreak Googly', bat: 28, bowl: 90, field: 80, basePrice: 1.5, avatar: '♟️' },
  { id: 'P042', name: 'Mohammed Siraj', country: 'India', age: 32, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Right-arm Fast', bat: 34, bowl: 89, field: 86, basePrice: 1.5, avatar: '🚓' },
  { id: 'P043', name: 'Kagiso Rabada', country: 'South Africa', age: 31, role: 'Bowler', batStyle: 'Left-hand', bowlStyle: 'Right-arm Fast', bat: 48, bowl: 91, field: 87, basePrice: 2.0, avatar: '🐆' },
  { id: 'P044', name: 'Matheesha Pathirana', country: 'Sri Lanka', age: 23, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Right-arm Sling Fast', bat: 25, bowl: 90, field: 84, basePrice: 1.5, avatar: '🐍' },
  { id: 'P045', name: 'Varun Chakaravarthy', country: 'India', age: 34, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Mystery Spin', bat: 26, bowl: 89, field: 81, basePrice: 1.5, avatar: '🧩' },
  { id: 'P046', name: 'Ravi Bishnoi', country: 'India', age: 25, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Legbreak Googly', bat: 35, bowl: 87, field: 90, basePrice: 1.0, avatar: '💫' },
  { id: 'P047', name: 'Harshit Rana', country: 'India', age: 24, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Right-arm Fast', bat: 45, bowl: 85, field: 83, basePrice: 0.75, avatar: '🚀' },
  { id: 'P048', name: 'Mayank Yadav', country: 'India', age: 23, role: 'Bowler', batStyle: 'Right-hand', bowlStyle: 'Right-arm Express', bat: 30, bowl: 88, field: 82, basePrice: 0.75, avatar: '⚡' },
];

// ============================================================================
// 3. CENTRALIZED STORAGE & ROOM MANAGER (src/utils/roomManager.js)
//    Single Source of Truth: localStorage key 'cricketverse_rooms'
// ============================================================================
const ROOMS_STORAGE_KEY = 'cricketverse_rooms';
const USERS_STORAGE_KEY = 'cricketverse_users';
const CURRENT_USER_KEY = 'cricketverse_current_user';
const MATCH_HISTORY_KEY = 'cricketverse_match_history';

const DEFAULT_DEMO_ACCOUNTS = [
  { id: 'user_host_1', username: 'Aarav (Host Pro)', email: 'aarav@cricketverse.gg', avatar: '👑', favoriteTeam: 'CSK' },
  { id: 'user_demo_2', username: 'Rohan (Challenger)', email: 'rohan@cricketverse.gg', avatar: '🦁', favoriteTeam: 'RCB' },
  { id: 'user_demo_3', username: 'Vikram (Tactician)', email: 'vikram@cricketverse.gg', avatar: '⚡', favoriteTeam: 'MI' },
  { id: 'user_demo_4', username: 'Kabir (Auctioneer)', email: 'kabir@cricketverse.gg', avatar: '🔥', favoriteTeam: 'KKR' },
];

const roomManager = {
  getAllRooms() {
    try {
      const raw = localStorage.getItem(ROOMS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to read rooms from localStorage:', e);
      return [];
    }
  },

  saveAllRooms(rooms) {
    try {
      localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
      // Dispatch storage-like custom event for same-tab synchronization
      window.dispatchEvent(new Event('cricketverse_rooms_updated'));
      return true;
    } catch (e) {
      console.error('Failed to save rooms to localStorage:', e);
      return false;
    }
  },

  generateUniqueCode(existingRooms) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes ambiguous 0/O, 1/I
    let code = '';
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
    } while (existingRooms.some((r) => r.code === code) && attempts < 100);
    return code;
  },

  getRoomByCode(rawCode) {
    if (!rawCode || typeof rawCode !== 'string') return null;
    const cleanCode = rawCode.trim().toUpperCase();
    const rooms = this.getAllRooms();
    return rooms.find((r) => r.code === cleanCode) || null;
  },

  getRoomById(roomId) {
    if (!roomId) return null;
    const rooms = this.getAllRooms();
    return rooms.find((r) => r.id === roomId) || null;
  },

  createRoom({ hostUser, settings = {} }) {
    if (!hostUser || !hostUser.id) {
      return { success: false, error: 'You must be logged in to create a room.' };
    }

    const rooms = this.getAllRooms();
    const code = this.generateUniqueCode(rooms);
    const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const maxParticipants = Math.min(10, Math.max(2, Number(settings.maxParticipants) || 4));
    const startingPurse = Math.max(20, Number(settings.startingPurse) || 100);
    const minSquadSize = Math.min(15, Math.max(5, Number(settings.minSquadSize) || 12));
    const maxSquadSize = Math.min(18, Math.max(minSquadSize, Number(settings.maxSquadSize) || 12));
    const timerSeconds = Math.min(60, Math.max(5, Number(settings.timerSeconds) || 15));
    const bidIncrement = Math.max(0.1, Number(settings.bidIncrement) || 0.25);

    const newRoom = {
      id,
      code,
      name: (settings.roomName || `${hostUser.username}'s IPL Arena`).trim(),
      hostId: hostUser.id,
      hostUsername: hostUser.username,
      status: 'waiting', // 'waiting' | 'auction' | 'completed' | 'closed'
      isLocked: false,
      createdAt: new Date().toISOString(),
      settings: {
        maxParticipants,
        startingPurse, // in Crores
        minSquadSize,
        maxSquadSize,
        timerSeconds,
        bidIncrement,
        auctionFormat: settings.auctionFormat || 'Mega Auction',
        availableTeams: settings.availableTeams || IPL_TEAMS.map((t) => t.id),
        matchOvers: Number(settings.matchOvers) || 5,
      },
      participants: [
        {
          userId: hostUser.id,
          username: hostUser.username,
          avatar: hostUser.avatar || '👑',
          teamId: null,
          purse: startingPurse,
          squad: [],
          playingXI: [],
          captainId: null,
          keeperId: null,
          joinedAt: new Date().toISOString(),
          isReady: true,
        },
      ],
      auction: {
        status: 'idle', // 'idle' | 'active' | 'paused' | 'sold_anim' | 'unsold_anim' | 'completed'
        playerPool: [...INITIAL_PLAYERS],
        currentIndex: 0,
        currentBid: 0,
        highestBidderId: null,
        highestBidderName: null,
        highestBidderTeamId: null,
        timer: timerSeconds,
        bidHistory: [],
        soldLog: [],
        unsoldIds: [],
        lastResult: null,
      },
      roomMatch: null,
    };

    const updatedRooms = [newRoom, ...rooms];
    const saved = this.saveAllRooms(updatedRooms);
    if (!saved) {
      return { success: false, error: 'Storage error: Could not save room to localStorage.' };
    }

    const verified = this.getRoomByCode(code);
    if (!verified) {
      return { success: false, error: 'Verification failed after saving room.' };
    }

    return { success: true, room: verified };
  },

  joinRoom(rawCode, user) {
    // 1. Verify login
    if (!user || !user.id) {
      return { success: false, error: 'Please log in or select a demo account before joining a room.' };
    }

    // 2 & 3. Trim whitespace & convert to uppercase
    const code = (rawCode || '').trim().toUpperCase();

    // 4. Validate code format
    if (!code) {
      return { success: false, error: 'Please enter a 6-character room code.' };
    }
    if (code.length !== 6) {
      return { success: false, error: `Invalid code length (${code.length}/6). Room codes are exactly 6 characters.` };
    }

    // 5 & 6. Load rooms & find matching room using room.code
    const rooms = this.getAllRooms();
    const roomIndex = rooms.findIndex((r) => r.code === code);

    // 7. Verify room exists
    if (roomIndex === -1) {
      return { success: false, error: `Room "${code}" does not exist. Check the code or create a new room.` };
    }

    const room = { ...rooms[roomIndex] };

    if (room.status === 'closed') {
      return { success: false, error: 'This room has been closed by the host.' };
    }

    // 10. Check if user is ALREADY a participant (allow seamless rejoin!)
    const existingParticipant = room.participants.find((p) => p.userId === user.id);
    if (existingParticipant) {
      return { success: true, room, rejoined: true };
    }

    // 8. Verify room is waiting (unless returning member handled above)
    if (room.status !== 'waiting') {
      return { success: false, error: `Cannot join: Auction in room "${code}" is already ${room.status}.` };
    }

    if (room.isLocked) {
      return { success: false, error: 'This room is currently locked by the host.' };
    }

    // 9. Verify room is not full
    if (room.participants.length >= room.settings.maxParticipants) {
      return {
        success: false,
        error: `Room "${code}" is full (${room.participants.length}/${room.settings.maxParticipants} franchises).`,
      };
    }

    // 11. Add participant without overwriting existing participants
    const newParticipant = {
      userId: user.id,
      username: user.username,
      avatar: user.avatar || '🏏',
      teamId: null,
      purse: room.settings.startingPurse,
      squad: [],
      playingXI: [],
      captainId: null,
      keeperId: null,
      joinedAt: new Date().toISOString(),
      isReady: false,
    };

    room.participants = [...room.participants, newParticipant];
    rooms[roomIndex] = room;

    // 12. Save updated room
    const saved = this.saveAllRooms(rooms);
    if (!saved) {
      return { success: false, error: 'Failed to save room state. Please check browser storage settings.' };
    }

    // 13. Verify saved room
    const verified = this.getRoomByCode(code);
    if (!verified || !verified.participants.some((p) => p.userId === user.id)) {
      return { success: false, error: 'Could not verify participant registration in storage.' };
    }

    return { success: true, room: verified, rejoined: false };
  },

  updateRoom(roomId, updaterFn) {
    const rooms = this.getAllRooms();
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx === -1) return null;
    const updated = typeof updaterFn === 'function' ? updaterFn(rooms[idx]) : { ...rooms[idx], ...updaterFn };
    rooms[idx] = updated;
    this.saveAllRooms(rooms);
    return updated;
  },

  updateParticipant(roomId, userId, patch) {
    return this.updateRoom(roomId, (room) => ({
      ...room,
      participants: room.participants.map((p) => (p.userId === userId ? { ...p, ...patch } : p)),
    }));
  },

  removePlayer(roomId, targetUserId) {
    return this.updateRoom(roomId, (room) => ({
      ...room,
      participants: room.participants.filter((p) => p.userId !== targetUserId),
    }));
  },

  leaveRoom(roomId, userId) {
    const room = this.getRoomById(roomId);
    if (!room) return null;
    if (room.hostId === userId && room.participants.length > 1) {
      // Transfer host to next participant automatically
      const nextHost = room.participants.find((p) => p.userId !== userId);
      return this.updateRoom(roomId, (r) => ({
        ...r,
        hostId: nextHost.userId,
        hostUsername: nextHost.username,
        participants: r.participants.filter((p) => p.userId !== userId),
      }));
    } else if (room.hostId === userId && room.participants.length <= 1) {
      this.deleteRoom(roomId);
      return null;
    }
    return this.removePlayer(roomId, userId);
  },

  deleteRoom(roomId) {
    const rooms = this.getAllRooms().filter((r) => r.id !== roomId);
    this.saveAllRooms(rooms);
  },
};

// ============================================================================
// 4. CRICKET GAME ENGINE (Physics, Batting Swipe Calculation, Bowling & AI)
// ============================================================================
function simulateDeliveryOutcome({
  batter,
  bowler,
  swipeDirection, // 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'DIAG_LEFT' | 'DIAG_RIGHT' | 'TAP' | 'POWER'
  timingScore, // 0 to 100 (100 = dead center sweet spot)
  deliveryType, // 'Fast' | 'Swing' | 'Spin' | 'Yorker' | 'Bouncer' | 'Good Length' | 'Full'
  line, // 'Off' | 'Middle' | 'Leg'
  length, // 'Short' | 'Good' | 'Full' | 'Yorker'
  aggression = 1,
}) {
  const batSkill = batter?.bat || 75;
  const bowlSkill = bowler?.bowl || 75;
  const skillDiff = (batSkill - bowlSkill) * 0.35; // -15 to +15 advantage

  // Delivery difficulty modifier
  let deliveryDanger = 0;
  if (deliveryType === 'Yorker' && swipeDirection === 'UP') deliveryDanger += 18;
  if (deliveryType === 'Bouncer' && swipeDirection === 'DOWN') deliveryDanger -= 10;
  if (deliveryType === 'Bouncer' && swipeDirection === 'TAP') deliveryDanger += 12;
  if (deliveryType === 'Swing' && (swipeDirection === 'POWER' || swipeDirection === 'UP')) deliveryDanger += 8;

  // Effective timing combines user reaction + batter skill vs bowler skill
  const effectiveTiming = Math.max(0, Math.min(100, timingScore + skillDiff - deliveryDanger));

  // Defensive shots rarely get out
  if (swipeDirection === 'DOWN' || swipeDirection === 'TAP') {
    if (effectiveTiming < 18) {
      return {
        runs: 0,
        isWicket: true,
        wicketType: deliveryType === 'Spin' ? 'Stumped' : 'Bowled',
        shotName: 'Defended Late',
        ballAngle: 0,
        ballDistance: 0.15,
        commentary: `Clean through the gate! ${bowler.name} beats ${batter.name}'s defense!`,
      };
    }
    if (effectiveTiming > 72) {
      return {
        runs: 1,
        isWicket: false,
        shotName: 'Soft Hands Single',
        ballAngle: swipeDirection === 'TAP' ? 25 : -25,
        ballDistance: 0.42,
        commentary: `Tapped into the gap with soft hands for a quick single.`,
      };
    }
    return {
      runs: 0,
      isWicket: false,
      shotName: 'Solid Block',
      ballAngle: 0,
      ballDistance: 0.22,
      commentary: `Solid forward defense by ${batter.name}. Dot ball.`,
    };
  }

  // Aggressive / Directional Shots: UP, LEFT, RIGHT, DIAG_LEFT, DIAG_RIGHT, POWER
  const angleMap = {
    UP: 0,
    POWER: (Math.random() - 0.5) * 24,
    LEFT: -65,
    RIGHT: 65,
    DIAG_LEFT: -35,
    DIAG_RIGHT: 35,
  };
  const baseAngle = angleMap[swipeDirection] ?? 0;

  // High risk shots (POWER / UP) have higher wicket threshold on poor timing
  const wicketThreshold = swipeDirection === 'POWER' ? 34 : swipeDirection === 'UP' ? 30 : 24;

  if (effectiveTiming < wicketThreshold) {
    const wicketTypes =
      deliveryType === 'Yorker'
        ? ['Bowled', 'LBW']
        : swipeDirection === 'UP' || swipeDirection === 'POWER'
        ? ['Caught in the Deep', 'Caught at Long-On']
        : ['Caught at Slip', 'LBW', 'Run Out'];
    const wicketType = wicketTypes[Math.floor(Math.random() * wicketTypes.length)];
    return {
      runs: 0,
      isWicket: true,
      wicketType,
      shotName: 'Mistimed Loft',
      ballAngle: baseAngle + (Math.random() - 0.5) * 20,
      ballDistance: 0.55,
      commentary: `OUT! ${wicketType}! ${batter.name} mistimes the ${swipeDirection.toLowerCase()} shot off ${bowler.name}!`,
    };
  }

  // Six threshold
  const sixThreshold = swipeDirection === 'POWER' ? 80 : swipeDirection === 'UP' ? 84 : 90;
  if (effectiveTiming >= sixThreshold) {
    return {
      runs: 6,
      isWicket: false,
      shotName: swipeDirection === 'POWER' ? 'MONSTER SIX!' : 'Lofted Maximum!',
      ballAngle: baseAngle,
      ballDistance: 1.15,
      commentary: `MASSIVE SIX! ${batter.name} launches ${bowler.name} deep into the second tier!`,
    };
  }

  // Four threshold
  if (effectiveTiming >= 64) {
    return {
      runs: 4,
      isWicket: false,
      shotName:
        swipeDirection === 'LEFT'
          ? 'Whipped Flick FOUR!'
          : swipeDirection === 'RIGHT'
          ? 'Crisp Cover Drive FOUR!'
          : 'Piercing Boundary FOUR!',
      ballAngle: baseAngle,
      ballDistance: 0.98,
      commentary: `FOUR RUNS! Glorious timing by ${batter.name}, racing across the turf to the rope!`,
    };
  }

  // 1, 2, or 3 runs
  const runs = effectiveTiming >= 52 ? 2 : effectiveTiming >= 40 ? 1 : 0;
  return {
    runs,
    isWicket: false,
    shotName: runs === 2 ? 'Hard-Run Brace' : runs === 1 ? 'Placed Single' : 'Fielded Dot',
    ballAngle: baseAngle,
    ballDistance: runs === 2 ? 0.65 : runs === 1 ? 0.48 : 0.32,
    commentary:
      runs === 2
        ? `Good running between the wickets! ${batter.name} pushes hard for two.`
        : runs === 1
        ? `Pushed into the outfield for a comfortable single.`
        : `Straight to the fielder inside the 30-yard circle. No run.`,
  };
}

// Helper: Generate a balanced 12-player squad for Quick Match or auto-fill
function buildAutoSquad(teamId, excludeIds = []) {
  const pool = INITIAL_PLAYERS.filter((p) => !excludeIds.includes(p.id));
  const keepers = pool.filter((p) => p.role === 'WK-Batter').slice(0, 2);
  const batters = pool.filter((p) => p.role === 'Batter').slice(0, 4);
  const allRounders = pool.filter((p) => p.role === 'All-Rounder').slice(0, 3);
  const bowlers = pool.filter((p) => p.role === 'Bowler').slice(0, 3);
  const combined = [...keepers, ...batters, ...allRounders, ...bowlers];
  while (combined.length < 12 && pool.length > combined.length) {
    const next = pool.find((p) => !combined.some((c) => c.id === p.id));
    if (next) combined.push(next);
    else break;
  }
  return combined.slice(0, 12);
}

// ============================================================================
// 5. MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // --- Auth State ---
  const [users, setUsers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY));
      return Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_DEMO_ACCOUNTS;
    } catch {
      return DEFAULT_DEMO_ACCOUNTS;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
      return saved || DEFAULT_DEMO_ACCOUNTS[0];
    } catch {
      return DEFAULT_DEMO_ACCOUNTS[0];
    }
  });

  // --- Navigation State (SPA Routing with URL hash sync) ---
  const [route, setRoute] = useState({ page: 'dashboard', roomCode: null, matchConfig: null });

  // --- Rooms State (Synchronized with cricketverse_rooms) ---
  const [rooms, setRooms] = useState(() => roomManager.getAllRooms());

  // --- Match History & Career Stats ---
  const [matchHistory, setMatchHistory] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MATCH_HISTORY_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  // --- Global UI Notifications & Audio ---
  const [toast, setToast] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast((prev) => (prev && Date.now() - prev.id >= 3400 ? null : prev));
    }, 3500);
  }, []);

  // Sync rooms across tabs & same-tab custom events
  useEffect(() => {
    const syncRooms = () => {
      setRooms(roomManager.getAllRooms());
    };
    window.addEventListener('storage', syncRooms);
    window.addEventListener('cricketverse_rooms_updated', syncRooms);
    return () => {
      window.removeEventListener('storage', syncRooms);
      window.removeEventListener('cricketverse_rooms_updated', syncRooms);
    };
  }, []);

  // Persist user changes
  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, [currentUser]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.muted = next;
  };

  const handleVolumeChange = (val) => {
    setVolume(val);
    sound.volume = val;
  };

  const switchDemoAccount = (userObj) => {
    setCurrentUser(userObj);
    showToast(`Switched active account to ${userObj.username}`, 'success');
  };

  const registerUser = (username, email, avatar) => {
    const cleanName = username.trim();
    if (!cleanName) return showToast('Username is required', 'error');
    const newUser = {
      id: `user_${Date.now()}`,
      username: cleanName,
      email: email.trim() || `${cleanName.toLowerCase().replace(/\s+/g, '')}@cricketverse.gg`,
      avatar: avatar || '🏏',
      favoriteTeam: 'CSK',
    };
    setUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    showToast(`Welcome to CricketVerse, ${newUser.username}!`, 'success');
    setRoute({ page: 'dashboard', roomCode: null });
  };

  const saveCompletedMatch = (record) => {
    const updated = [record, ...matchHistory];
    setMatchHistory(updated);
    localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(updated));
  };

  // Current active room derived directly from rooms + route.roomCode
  const activeRoom = useMemo(() => {
    if (!route.roomCode) return null;
    return rooms.find((r) => r.code === route.roomCode.toUpperCase()) || null;
  }, [rooms, route.roomCode]);

  const navigate = (page, extra = {}) => {
    setRoute({ page, roomCode: extra.roomCode || null, matchConfig: extra.matchConfig || null });
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950 flex flex-col">
      {/* Top Broadcast Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <button
            onClick={() => navigate('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-amber-400 p-[2px] shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center text-xl">
                🏏
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-wider text-base sm:text-lg bg-gradient-to-r from-emerald-400 via-teal-200 to-amber-300 bg-clip-text text-transparent">
                  CRICKETVERSE
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  IPL 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">Auction & Swipe Stadium Engine</p>
            </div>
          </button>

          {/* Main Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Trophy },
              { id: 'rooms', label: 'Auction Rooms', icon: Gavel },
              { id: 'my-team', label: 'My Squad', icon: Shield },
              { id: 'cricket-game', label: 'Cricket Game', icon: Play },
              { id: 'tournaments', label: 'Tournaments', icon: Award },
              { id: 'history', label: 'Stats & History', icon: BarChart2 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive =
                route.page === item.id ||
                (item.id === 'rooms' && ['create-room', 'join-room', 'lobby', 'auction'].includes(route.page));
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Same-Browser Multi-Account Switcher + Audio */}
          <div className="flex items-center gap-2">
            {/* Audio Controls */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <button
                onClick={toggleMute}
                title={isMuted ? 'Unmute Game Audio' : 'Mute Game Audio'}
                className="text-slate-300 hover:text-emerald-400 transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-12 sm:w-16 accent-emerald-400 cursor-pointer hidden sm:block"
              />
            </div>

            {/* Same-Browser Demo Account Switcher (For Local Multiplayer Testing) */}
            <div className="relative group">
              <div className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 cursor-pointer transition-all">
                <span className="text-base">{currentUser?.avatar || '👤'}</span>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white leading-tight max-w-[110px] truncate">
                    {currentUser?.username || 'Guest'}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium leading-tight">Switch Account ▾</div>
                </div>
              </div>

              {/* Dropdown for instant multi-account testing */}
              <div className="absolute right-0 mt-1.5 w-64 bg-[#0F172A] border border-slate-700 rounded-2xl shadow-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="px-2.5 py-1.5 border-b border-slate-800 mb-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Same-Browser Multiplayer
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Switch accounts to join rooms, bid, & play head-to-head locally.
                  </p>
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {users.map((u) => {
                    const active = currentUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => switchDemoAccount(u)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                          active
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span>{u.avatar}</span>
                          <span className="truncate">{u.username}</span>
                        </span>
                        {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => navigate('profile')}
                  className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Custom Account
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom-Header Navigation */}
        <div className="flex lg:hidden items-center gap-1 overflow-x-auto px-3 py-2 border-t border-slate-800/60 bg-[#0B1120]">
          {[
            { id: 'dashboard', label: 'Home' },
            { id: 'rooms', label: 'Rooms' },
            { id: 'my-team', label: 'Squad' },
            { id: 'cricket-game', label: 'Play Cricket' },
            { id: 'tournaments', label: 'Tournaments' },
            { id: 'history', label: 'Stats' },
            { id: 'profile', label: 'Profile' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                route.page === item.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Global Toast Feedback Banner */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-bounce">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md text-sm font-semibold ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-900/95 border-amber-500/40 text-amber-200'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Routed View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-6">
        {route.page === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            rooms={rooms}
            matchHistory={matchHistory}
            navigate={navigate}
            showToast={showToast}
          />
        )}

        {route.page === 'rooms' && (
          <RoomsHubView
            currentUser={currentUser}
            rooms={rooms}
            navigate={navigate}
            showToast={showToast}
          />
        )}

        {route.page === 'create-room' && (
          <CreateRoomView currentUser={currentUser} navigate={navigate} showToast={showToast} />
        )}

        {route.page === 'join-room' && (
          <JoinRoomView currentUser={currentUser} navigate={navigate} showToast={showToast} />
        )}

        {route.page === 'lobby' && (
          <RoomLobbyView
            room={activeRoom}
            roomCode={route.roomCode}
            currentUser={currentUser}
            navigate={navigate}
            showToast={showToast}
          />
        )}

        {route.page === 'auction' && (
          <AuctionRoomView
            room={activeRoom}
            roomCode={route.roomCode}
            currentUser={currentUser}
            navigate={navigate}
            showToast={showToast}
          />
        )}

        {route.page === 'my-team' && (
          <TeamSquadView
            rooms={rooms}
            currentUser={currentUser}
            navigate={navigate}
            showToast={showToast}
          />
        )}

        {route.page === 'cricket-game' && (
          <CricketGameView
            rooms={rooms}
            currentUser={currentUser}
            initialMatchConfig={route.matchConfig}
            onMatchComplete={saveCompletedMatch}
            navigate={navigate}
            showToast={showToast}
          />
        )}

        {route.page === 'tournaments' && (
          <TournamentView
            rooms={rooms}
            matchHistory={matchHistory}
            navigate={navigate}
          />
        )}

        {route.page === 'history' && (
          <MatchHistoryView matchHistory={matchHistory} rooms={rooms} />
        )}

        {route.page === 'profile' && (
          <ProfileView
            users={users}
            currentUser={currentUser}
            onSwitch={switchDemoAccount}
            onRegister={registerUser}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// 6. DASHBOARD VIEW
// ============================================================================
function DashboardView({ currentUser, rooms, matchHistory, navigate, showToast }) {
  const [quickCode, setQuickCode] = useState('');

  const handleQuickJoin = (e) => {
    e.preventDefault();
    const res = roomManager.joinRoom(quickCode, currentUser);
    if (!res.success) {
      showToast(res.error, 'error');
      return;
    }
    showToast(res.rejoined ? `Rejoined room ${res.room.code}!` : `Joined room ${res.room.code}!`, 'success');
    const targetPage = res.room.status === 'auction' ? 'auction' : 'lobby';
    navigate(targetPage, { roomCode: res.room.code });
  };

  const myRooms = rooms.filter((r) => r.participants.some((p) => p.userId === currentUser?.id));
  const completedAuctionRooms = rooms.filter((r) => r.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Hero Stadium Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#0B1F2A] to-[#111827] border border-emerald-500/25 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              END-TO-END IPL AUCTION & SWIPE CRICKET ENGINE
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Build Your <span className="text-amber-400">₹100 Cr</span> Dynasty.{' '}
              <span className="text-emerald-400">Dominate</span> The Pitch.
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl">
              Create an auction room, switch demo accounts in the top bar to simulate multiplayer bidding, draft your
              12-player IPL squad, and step onto the stadium pitch with swipe-based batting & bowling.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => navigate('create-room')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all"
              >
                <Plus className="w-4 h-4" /> Create Auction Room
              </button>
              <button
                onClick={() => navigate('cricket-game')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold text-sm transition-all"
              >
                <Play className="w-4 h-4" /> Play Cricket Match
              </button>
            </div>
          </div>

          {/* Instant Join Card */}
          <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <LogIn className="w-4 h-4 text-emerald-400" /> Quick Join Room
              </h2>
              <span className="text-[11px] text-slate-400">6-Char Code</span>
            </div>
            <form onSubmit={handleQuickJoin} className="space-y-3">
              <input
                type="text"
                maxLength={10}
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
                placeholder="Enter code (e.g. X7K9P2)"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:outline-none text-white font-mono text-lg tracking-widest uppercase placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all flex items-center justify-center gap-2"
              >
                Join Lobby Now <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tip: Case-insensitive & trims spaces automatically. Switch accounts in the header to test multi-player
              joining in the same browser.
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Rooms', value: rooms.length, icon: Gavel, color: 'text-emerald-400' },
          { label: 'Your Joined Rooms', value: myRooms.length, icon: Users, color: 'text-amber-400' },
          { label: 'Auctions Completed', value: completedAuctionRooms.length, icon: Trophy, color: 'text-purple-400' },
          { label: 'Matches Played', value: matchHistory.length, icon: Flame, color: 'text-rose-400' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#0F172A] border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active & Recent Rooms List */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Gavel className="w-5 h-5 text-amber-400" /> Live & Available Rooms
          </h2>
          <button
            onClick={() => navigate('rooms')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            View All Rooms →
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl space-y-3">
            <p className="text-slate-400 text-sm">No auction rooms created yet.</p>
            <button
              onClick={() => navigate('create-room')}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Create First Room
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.slice(0, 6).map((room) => {
              const isMember = room.participants.some((p) => p.userId === currentUser?.id);
              return (
                <div
                  key={room.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-800 font-mono text-xs font-bold text-amber-300 border border-amber-500/20">
                        {room.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          room.status === 'waiting'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : room.status === 'auction'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base truncate">{room.name}</h3>
                    <p className="text-xs text-slate-400">
                      Host: <span className="text-slate-200 font-medium">{room.hostUsername}</span> •{' '}
                      {room.participants.length}/{room.settings.maxParticipants} Teams
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (isMember) {
                        navigate(room.status === 'auction' ? 'auction' : 'lobby', { roomCode: room.code });
                      } else {
                        const res = roomManager.joinRoom(room.code, currentUser);
                        if (!res.success) return showToast(res.error, 'error');
                        showToast(`Joined ${room.name}!`, 'success');
                        navigate('lobby', { roomCode: room.code });
                      }
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                      isMember
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isMember ? 'Enter Room →' : 'Join Room'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 7. ROOMS HUB, CREATE ROOM & JOIN ROOM VIEWS
// ============================================================================
function RoomsHubView({ currentUser, rooms, navigate, showToast }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">IPL Auction Rooms</h1>
          <p className="text-sm text-slate-400">Create a custom room or join an existing lobby using its 6-digit code.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('join-room')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700"
          >
            <LogIn className="w-4 h-4 text-emerald-400" /> Join by Code
          </button>
          <button
            onClick={() => navigate('create-room')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
          >
            <Plus className="w-4 h-4" /> Create Room
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const isMember = room.participants.some((p) => p.userId === currentUser?.id);
          return (
            <div key={room.id} className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg text-sm">
                  {room.code}
                </span>
                <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-slate-800 text-emerald-400">
                  {room.status}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">{room.name}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Host: {room.hostUsername} • Purse: ₹{room.settings.startingPurse} Cr • Squad:{' '}
                  {room.settings.maxSquadSize}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {room.participants.map((p) => {
                  const t = IPL_TEAMS.find((team) => team.id === p.teamId);
                  return (
                    <span
                      key={p.userId}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                    >
                      {p.username} {t ? `(${t.short})` : ''}
                    </span>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (isMember) {
                      navigate(room.status === 'auction' ? 'auction' : 'lobby', { roomCode: room.code });
                    } else {
                      const res = roomManager.joinRoom(room.code, currentUser);
                      if (!res.success) return showToast(res.error, 'error');
                      showToast(`Joined ${room.code}!`, 'success');
                      navigate('lobby', { roomCode: room.code });
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
                >
                  {isMember ? 'Open Room' : 'Join Room'}
                </button>
                {room.hostId === currentUser?.id && (
                  <button
                    onClick={() => {
                      roomManager.deleteRoom(room.id);
                      showToast('Room deleted.', 'info');
                    }}
                    className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30"
                    title="Delete Room"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateRoomView({ currentUser, navigate, showToast }) {
  const [roomName, setRoomName] = useState(`${currentUser?.username || 'Host'}'s IPL Mega Auction`);
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [startingPurse, setStartingPurse] = useState(100);
  const [maxSquadSize, setMaxSquadSize] = useState(12);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [bidIncrement, setBidIncrement] = useState(0.5);
  const [auctionFormat, setAuctionFormat] = useState('Mega Auction');

  const handleCreate = (e) => {
    e.preventDefault();
    const res = roomManager.createRoom({
      hostUser: currentUser,
      settings: {
        roomName,
        maxParticipants,
        startingPurse,
        minSquadSize: maxSquadSize,
        maxSquadSize,
        timerSeconds,
        bidIncrement,
        auctionFormat,
      },
    });

    if (!res.success) {
      showToast(res.error, 'error');
      return;
    }

    sound.bid();
    showToast(`Room ${res.room.code} created!`, 'success');
    navigate('lobby', { roomCode: res.room.code });
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Create IPL Auction Room</h1>
          <p className="text-xs text-slate-400 mt-1">Configure purse limits, timer rules, and franchise slots.</p>
        </div>
        <button onClick={() => navigate('dashboard')} className="text-xs text-slate-400 hover:text-white">
          ← Back
        </button>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Room Name</label>
          <input
            type="text"
            required
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Max Franchises (2–10)
            </label>
            <select
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            >
              {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} Franchises
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Auction Format
            </label>
            <select
              value={auctionFormat}
              onChange={(e) => setAuctionFormat(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            >
              <option value="Mega Auction">IPL Mega Auction</option>
              <option value="Mini Auction">IPL Mini Auction</option>
              <option value="Turbo Blitz">Turbo Blitz Auction</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Starting Purse (₹ Crores)
            </label>
            <input
              type="number"
              min={30}
              max={200}
              value={startingPurse}
              onChange={(e) => setStartingPurse(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Squad Size (Players)
            </label>
            <select
              value={maxSquadSize}
              onChange={(e) => setMaxSquadSize(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            >
              <option value={12}>12 Players (Standard Playing XI + 1 Impact)</option>
              <option value={11}>11 Players (Playing XI)</option>
              <option value={15}>15 Players (Full Squad)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Bid Timer (Seconds)
            </label>
            <select
              value={timerSeconds}
              onChange={(e) => setTimerSeconds(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            >
              <option value={10}>10 Seconds (Fast)</option>
              <option value={15}>15 Seconds (Standard)</option>
              <option value={25}>25 Seconds (Tactical)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Default Bid Increment
            </label>
            <select
              value={bidIncrement}
              onChange={(e) => setBidIncrement(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            >
              <option value={0.25}>₹0.25 Cr (25 Lakhs)</option>
              <option value={0.5}>₹0.50 Cr (50 Lakhs)</option>
              <option value={1.0}>₹1.00 Cr</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all"
        >
          Generate Room Code & Enter Lobby →
        </button>
      </form>
    </div>
  );
}

function JoinRoomView({ currentUser, navigate, showToast }) {
  const [codeInput, setCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const res = roomManager.joinRoom(codeInput, currentUser);
    if (!res.success) {
      setErrorMsg(res.error);
      showToast(res.error, 'error');
      return;
    }
    sound.bid();
    showToast(res.rejoined ? `Returned to room ${res.room.code}` : `Successfully joined ${res.room.code}!`, 'success');
    const targetPage = res.room.status === 'auction' ? 'auction' : 'lobby';
    navigate(targetPage, { roomCode: res.room.code });
  };

  return (
    <div className="max-w-md mx-auto bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Join Auction Room</h1>
        <p className="text-xs text-slate-400 mt-1">
          Logged in as <span className="text-emerald-400 font-bold">{currentUser?.username}</span>
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            6-Character Room Code
          </label>
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="e.g. A9B4K2"
            className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xl tracking-widest uppercase text-center focus:border-emerald-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all"
        >
          Verify & Join Room
        </button>
      </form>
    </div>
  );
}

// ============================================================================
// 8. ROOM LOBBY VIEW (Team Selection + Complete Host Controls)
// ============================================================================
function RoomLobbyView({ room, roomCode, currentUser, navigate, showToast }) {
  const [copied, setCopied] = useState(false);
  const [editRoomName, setEditRoomName] = useState(room?.name || '');

  useEffect(() => {
    if (room?.name) setEditRoomName(room.name);
  }, [room?.name]);

  if (!room) {
    return (
      <div className="max-w-lg mx-auto bg-[#0F172A] border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Room "{roomCode}" Not Found</h2>
        <p className="text-sm text-slate-400">The room may have been closed by the host or does not exist.</p>
        <button
          onClick={() => navigate('dashboard')}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isHost = room.hostId === currentUser?.id;
  const myParticipant = room.participants.find((p) => p.userId === currentUser?.id);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(room.code);
    setCopied(true);
    showToast(`Copied room code ${room.code}!`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectTeam = (teamId) => {
    if (!myParticipant) return showToast('You are not a participant in this room.', 'error');
    const alreadyTaken = room.participants.some((p) => p.teamId === teamId && p.userId !== currentUser.id);
    if (alreadyTaken) {
      return showToast('That IPL franchise is already claimed by another owner!', 'error');
    }
    roomManager.updateParticipant(room.id, currentUser.id, { teamId });
    sound.bid();
    showToast(`Selected ${IPL_TEAMS.find((t) => t.id === teamId)?.name}!`, 'success');
  };

  const handleStartAuction = () => {
    if (!isHost) return;
    const unassigned = room.participants.filter((p) => !p.teamId);
    if (unassigned.length > 0) {
      return showToast(
        `All participants must select an IPL team first (${unassigned.map((u) => u.username).join(', ')} pending).`,
        'error'
      );
    }

    const firstPlayer = room.auction.playerPool[0];
    roomManager.updateRoom(room.id, (r) => ({
      ...r,
      status: 'auction',
      auction: {
        ...r.auction,
        status: 'active',
        currentIndex: 0,
        currentBid: firstPlayer.basePrice,
        highestBidderId: null,
        highestBidderName: null,
        highestBidderTeamId: null,
        timer: r.settings.timerSeconds,
        bidHistory: [],
      },
    }));

    sound.sold();
    showToast('IPL Live Auction has started!', 'success');
    navigate('auction', { roomCode: room.code });
  };

  // Add AI Bot Owner for instant solo testing if host wants extra teams
  const handleAddBotParticipant = () => {
    if (!isHost) return;
    if (room.participants.length >= room.settings.maxParticipants) {
      return showToast('Room is already at max capacity.', 'error');
    }
    const takenTeams = room.participants.map((p) => p.teamId).filter(Boolean);
    const freeTeam = IPL_TEAMS.find((t) => !takenTeams.includes(t.id));
    if (!freeTeam) return showToast('No free IPL teams left.', 'error');

    const botId = `bot_${Date.now()}`;
    roomManager.updateRoom(room.id, (r) => ({
      ...r,
      participants: [
        ...r.participants,
        {
          userId: botId,
          username: `AI Owner (${freeTeam.short})`,
          avatar: '🤖',
          teamId: freeTeam.id,
          purse: r.settings.startingPurse,
          squad: [],
          playingXI: [],
          captainId: null,
          keeperId: null,
          joinedAt: new Date().toISOString(),
          isReady: true,
          isBot: true,
        },
      ],
    }));
    showToast(`Added AI Franchise Owner for ${freeTeam.name}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Room Header */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 font-mono text-lg font-black text-amber-300 tracking-widest">
              {room.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Code'}
            </button>
            {room.isLocked && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white pt-1">{room.name}</h1>
          <p className="text-xs text-slate-400">
            Host: <span className="text-emerald-400 font-bold">{room.hostUsername}</span> • Purse: ₹
            {room.settings.startingPurse} Cr • Squad Target: {room.settings.maxSquadSize} Players • Timer:{' '}
            {room.settings.timerSeconds}s
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {room.status === 'auction' && (
            <button
              onClick={() => navigate('auction', { roomCode: room.code })}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm"
            >
              Enter Live Auction →
            </button>
          )}
          {isHost && room.status === 'waiting' && (
            <button
              onClick={handleStartAuction}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25"
            >
              <Gavel className="w-4 h-4" /> Start IPL Auction
            </button>
          )}
          <button
            onClick={() => {
              roomManager.leaveRoom(room.id, currentUser.id);
              showToast('Left room.', 'info');
              navigate('dashboard');
            }}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 font-bold text-xs border border-slate-700"
          >
            Leave Room
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: IPL Franchise Selection Grid */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Select Your IPL Franchise</h2>
                <p className="text-xs text-slate-400">
                  Each participant must lock in a unique IPL team before the auction begins.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400">
                {room.participants.filter((p) => p.teamId).length}/{room.participants.length} Selected
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {IPL_TEAMS.map((team) => {
                const owner = room.participants.find((p) => p.teamId === team.id);
                const isMine = owner?.userId === currentUser?.id;
                const isTaken = Boolean(owner && !isMine);

                return (
                  <button
                    key={team.id}
                    disabled={isTaken || room.status !== 'waiting'}
                    onClick={() => handleSelectTeam(team.id)}
                    style={{
                      borderColor: isMine ? team.primary : undefined,
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isMine
                        ? 'bg-slate-900 ring-2 ring-emerald-400 shadow-lg'
                        : isTaken
                        ? 'bg-slate-950/60 border-slate-800/60 opacity-60 cursor-not-allowed'
                        : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: team.primary, color: '#fff' }}
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black shadow-md"
                      >
                        {team.badge}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{team.name}</div>
                        <div className="text-xs text-slate-400">
                          {owner ? (
                            <span className={isMine ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                              Owner: {owner.username} {isMine ? '(You)' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-500">Available</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg ${
                        isMine
                          ? 'bg-emerald-500 text-slate-950'
                          : isTaken
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-800 text-emerald-400'
                      }`}
                    >
                      {isMine ? 'Selected' : isTaken ? 'Taken' : 'Select'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Participants + Host Control Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Participants List */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> Franchise Owners ({room.participants.length}/
                {room.settings.maxParticipants})
              </h3>
              {isHost && room.status === 'waiting' && (
                <button
                  onClick={handleAddBotParticipant}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                >
                  + Add AI Owner
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {room.participants.map((p) => {
                const team = IPL_TEAMS.find((t) => t.id === p.teamId);
                return (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg">{p.avatar}</span>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                          {p.username}
                          {room.hostId === p.userId && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {team ? `${team.badge} ${team.short}` : 'Choosing franchise...'}
                        </div>
                      </div>
                    </div>

                    {isHost && p.userId !== currentUser.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            roomManager.updateRoom(room.id, (r) => ({
                              ...r,
                              hostId: p.userId,
                              hostUsername: p.username,
                            }));
                            showToast(`Transferred host to ${p.username}`, 'info');
                          }}
                          title="Transfer Host"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-amber-400"
                        >
                          <Crown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            roomManager.removePlayer(room.id, p.userId);
                            showToast(`Removed ${p.username}`, 'info');
                          }}
                          title="Kick Participant"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Host Settings Panel */}
          {isHost && (
            <div className="bg-[#0F172A] border border-amber-500/30 rounded-3xl p-5 space-y-4">
              <h3 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4" /> Host Room Controls
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Room Title</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={editRoomName}
                      onChange={(e) => setEditRoomName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                    <button
                      onClick={() => {
                        roomManager.updateRoom(room.id, { name: editRoomName.trim() || room.name });
                        showToast('Updated room name', 'success');
                      }}
                      className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Purse (Cr)</label>
                    <input
                      type="number"
                      value={room.settings.startingPurse}
                      onChange={(e) => {
                        const val = Math.max(20, Number(e.target.value));
                        roomManager.updateRoom(room.id, (r) => ({
                          ...r,
                          settings: { ...r.settings, startingPurse: val },
                          participants: r.participants.map((p) => ({ ...p, purse: val })),
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Timer (Sec)</label>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={room.settings.timerSeconds}
                      onChange={(e) => {
                        const val = Math.max(5, Number(e.target.value));
                        roomManager.updateRoom(room.id, (r) => ({
                          ...r,
                          settings: { ...r.settings, timerSeconds: val },
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      roomManager.updateRoom(room.id, { isLocked: !room.isLocked });
                      showToast(room.isLocked ? 'Room unlocked' : 'Room locked', 'info');
                    }}
                    className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1.5"
                  >
                    {room.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {room.isLocked ? 'Unlock Room' : 'Lock Room'}
                  </button>
                  <button
                    onClick={() => {
                      roomManager.updateRoom(room.id, { status: 'closed' });
                      showToast('Room closed.', 'info');
                      navigate('dashboard');
                    }}
                    className="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold"
                  >
                    Close Room
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 9. LIVE IPL AUCTION ROOM VIEW (Real-time Timer, AI Bot Bidding, Host Controls)
// ============================================================================
function AuctionRoomView({ room, roomCode, currentUser, navigate, showToast }) {
  const [customPlayerName, setCustomPlayerName] = useState('');
  const [customPlayerRole, setCustomPlayerRole] = useState('All-Rounder');
  const [customBasePrice, setCustomBasePrice] = useState(1.0);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);

  if (!room) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Room "{roomCode}" not found.</p>
        <button onClick={() => navigate('dashboard')} className="mt-4 px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-bold">
          Go Home
        </button>
      </div>
    );
  }

  const isHost = room.hostId === currentUser?.id;
  const auction = room.auction;
  const currentPlayer = auction.playerPool[auction.currentIndex] || null;
  const myParticipant = room.participants.find((p) => p.userId === currentUser?.id);
  const myTeam = IPL_TEAMS.find((t) => t.id === myParticipant?.teamId);

  // Finalize sale or unsold for current player
  const finalizeCurrentLot = useCallback(() => {
    const latestRoom = roomManager.getRoomById(room.id);
    if (!latestRoom || latestRoom.auction.status !== 'active') return;

    const auc = latestRoom.auction;
    const player = auc.playerPool[auc.currentIndex];
    if (!player) return;

    const isSold = Boolean(auc.highestBidderId);

    if (isSold) {
      sound.sold();
      const winningParticipant = latestRoom.participants.find((p) => p.userId === auc.highestBidderId);
      const updatedParticipants = latestRoom.participants.map((p) => {
        if (p.userId !== auc.highestBidderId) return p;
        const alreadyInSquad = p.squad.some((sp) => sp.id === player.id);
        if (alreadyInSquad) return p;
        const newSquad = [...p.squad, { ...player, soldPrice: auc.currentBid }];
        return {
          ...p,
          purse: Number((p.purse - auc.currentBid).toFixed(2)),
          squad: newSquad,
          playingXI: newSquad.slice(0, 11).map((x) => x.id),
          captainId: p.captainId || newSquad[0]?.id || null,
          keeperId:
            p.keeperId || newSquad.find((x) => x.role === 'WK-Batter')?.id || newSquad[0]?.id || null,
        };
      });

      const saleRecord = {
        playerId: player.id,
        playerName: player.name,
        role: player.role,
        price: auc.currentBid,
        winnerId: auc.highestBidderId,
        winnerName: auc.highestBidderName,
        teamId: auc.highestBidderTeamId || winningParticipant?.teamId,
      };

      roomManager.updateRoom(latestRoom.id, {
        participants: updatedParticipants,
        auction: {
          ...auc,
          status: 'sold_anim',
          soldLog: [saleRecord, ...auc.soldLog],
          lastResult: { type: 'SOLD', player, price: auc.currentBid, teamId: saleRecord.teamId, owner: auc.highestBidderName },
        },
      });
    } else {
      sound.unsold();
      roomManager.updateRoom(latestRoom.id, {
        auction: {
          ...auc,
          status: 'unsold_anim',
          unsoldIds: [...new Set([...auc.unsoldIds, player.id])],
          lastResult: { type: 'UNSOLD', player },
        },
      });
    }
  }, [room.id]);

  // Advance to next player after SOLD/UNSOLD banner
  const advanceToNextPlayer = useCallback(() => {
    const latestRoom = roomManager.getRoomById(room.id);
    if (!latestRoom) return;
    const auc = latestRoom.auction;

    // Check if all teams have filled their squad limit
    const allTeamsFull = latestRoom.participants.every(
      (p) => p.squad.length >= latestRoom.settings.maxSquadSize
    );

    const nextIdx = auc.currentIndex + 1;
    if (allTeamsFull || nextIdx >= auc.playerPool.length) {
      sound.victory();
      roomManager.updateRoom(latestRoom.id, {
        status: 'completed',
        auction: {
          ...auc,
          status: 'completed',
          lastResult: null,
        },
      });
      return;
    }

    const nextPlayer = auc.playerPool[nextIdx];
    roomManager.updateRoom(latestRoom.id, {
      auction: {
        ...auc,
        status: 'active',
        currentIndex: nextIdx,
        currentBid: nextPlayer.basePrice,
        highestBidderId: null,
        highestBidderName: null,
        highestBidderTeamId: null,
        timer: latestRoom.settings.timerSeconds,
        bidHistory: [],
        lastResult: null,
      },
    });
  }, [room.id]);

  // Auction Countdown Loop (Host drives timer cleanly without duplicates)
  useEffect(() => {
    if (!isHost) return;
    if (auction.status === 'active') {
      const interval = setInterval(() => {
        const latest = roomManager.getRoomById(room.id);
        if (!latest || latest.auction.status !== 'active') return;

        // AI Bot smart bidding simulation
        const bots = latest.participants.filter((p) => p.isBot);
        const curPlayer = latest.auction.playerPool[latest.auction.currentIndex];
        if (bots.length > 0 && curPlayer && latest.auction.timer <= latest.settings.timerSeconds - 2 && Math.random() < 0.35) {
          const eligibleBots = bots.filter((b) => {
            const nextBid = latest.auction.highestBidderId
              ? Number((latest.auction.currentBid + latest.settings.bidIncrement).toFixed(2))
              : curPlayer.basePrice;
            const maxValuation = ((curPlayer.bat + curPlayer.bowl) / 20) * 1.35;
            return (
              latest.auction.highestBidderId !== b.userId &&
              b.squad.length < latest.settings.maxSquadSize &&
              b.purse >= nextBid &&
              nextBid <= maxValuation
            );
          });
          if (eligibleBots.length > 0) {
            const chosenBot = eligibleBots[Math.floor(Math.random() * eligibleBots.length)];
            const bidAmount = latest.auction.highestBidderId
              ? Number((latest.auction.currentBid + latest.settings.bidIncrement).toFixed(2))
              : curPlayer.basePrice;

            sound.bid();
            roomManager.updateRoom(latest.id, (r) => ({
              ...r,
              auction: {
                ...r.auction,
                currentBid: bidAmount,
                highestBidderId: chosenBot.userId,
                highestBidderName: chosenBot.username,
                highestBidderTeamId: chosenBot.teamId,
                timer: r.settings.timerSeconds,
                bidHistory: [
                  {
                    id: Date.now(),
                    bidderName: chosenBot.username,
                    teamId: chosenBot.teamId,
                    amount: bidAmount,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  },
                  ...r.auction.bidHistory,
                ],
              },
            }));
            return;
          }
        }

        if (latest.auction.timer <= 1) {
          finalizeCurrentLot();
        } else {
          if (latest.auction.timer <= 4) sound.tick();
          roomManager.updateRoom(latest.id, (r) => ({
            ...r,
            auction: { ...r.auction, timer: r.auction.timer - 1 },
          }));
        }
      }, 1000);
      return () => clearInterval(interval);
    }

    if (auction.status === 'sold_anim' || auction.status === 'unsold_anim') {
      const timeout = setTimeout(() => {
        advanceToNextPlayer();
      }, 2400);
      return () => clearTimeout(timeout);
    }
  }, [isHost, auction.status, room.id, finalizeCurrentLot, advanceToNextPlayer]);

  // Place Bid Handler
  const handlePlaceBid = (customIncrement = null) => {
    if (auction.status !== 'active') return showToast('Bidding is currently paused or between lots.', 'error');
    if (!myParticipant) return showToast('You must be a participant to bid.', 'error');
    if (!currentPlayer) return;

    if (myParticipant.squad.length >= room.settings.maxSquadSize) {
      return showToast(`Your squad is already full (${room.settings.maxSquadSize} players).`, 'error');
    }

    if (auction.highestBidderId === currentUser.id) {
      return showToast('You already hold the highest bid!', 'info');
    }

    const inc = customIncrement ?? room.settings.bidIncrement;
    const nextBid = auction.highestBidderId
      ? Number((auction.currentBid + inc).toFixed(2))
      : Number(currentPlayer.basePrice.toFixed(2));

    // Reserve ₹0.5 Cr per remaining required slot so team doesn't run out before filling XI
    const remainingSlotsAfterThis = Math.max(0, room.settings.maxSquadSize - myParticipant.squad.length - 1);
    const minReserve = remainingSlotsAfterThis * 0.5;

    if (nextBid > myParticipant.purse) {
      return showToast(`Insufficient purse! Remaining purse: ₹${myParticipant.purse} Cr`, 'error');
    }
    if (myParticipant.purse - nextBid < minReserve && room.settings.maxSquadSize <= 12) {
      return showToast(
        `Bid blocked: You must keep ₹${minReserve.toFixed(2)} Cr reserved for remaining squad slots.`,
        'error'
      );
    }

    sound.bid();
    roomManager.updateRoom(room.id, (r) => ({
      ...r,
      auction: {
        ...r.auction,
        currentBid: nextBid,
        highestBidderId: currentUser.id,
        highestBidderName: currentUser.username,
        highestBidderTeamId: myParticipant.teamId,
        timer: r.settings.timerSeconds,
        bidHistory: [
          {
            id: Date.now(),
            bidderName: currentUser.username,
            teamId: myParticipant.teamId,
            amount: nextBid,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
          ...r.auction.bidHistory,
        ],
      },
    }));
  };

  // Auto-fill remaining squads so user can jump straight to Cricket Game if desired
  const handleQuickCompleteAuction = () => {
    if (!isHost) return;
    const usedIds = new Set(room.participants.flatMap((p) => p.squad.map((s) => s.id)));
    const updatedParticipants = room.participants.map((p) => {
      const needed = Math.max(0, room.settings.maxSquadSize - p.squad.length);
      if (needed === 0) return p;
      const fillers = INITIAL_PLAYERS.filter((pl) => !usedIds.has(pl.id)).slice(0, needed);
      fillers.forEach((f) => usedIds.add(f.id));
      const newSquad = [
        ...p.squad,
        ...fillers.map((f) => ({ ...f, soldPrice: f.basePrice })),
      ];
      const spent = fillers.reduce((acc, f) => acc + f.basePrice, 0);
      return {
        ...p,
        purse: Math.max(0, Number((p.purse - spent).toFixed(2))),
        squad: newSquad,
        playingXI: newSquad.slice(0, 11).map((x) => x.id),
        captainId: p.captainId || newSquad[0]?.id || null,
        keeperId: p.keeperId || newSquad.find((x) => x.role === 'WK-Batter')?.id || newSquad[0]?.id || null,
      };
    });

    sound.victory();
    roomManager.updateRoom(room.id, {
      status: 'completed',
      participants: updatedParticipants,
      auction: { ...room.auction, status: 'completed', lastResult: null },
    });
    showToast('Auction completed & remaining squad slots drafted!', 'success');
  };

  const handleExportResults = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            roomCode: room.code,
            roomName: room.name,
            franchises: room.participants.map((p) => ({
              owner: p.username,
              team: p.teamId,
              remainingPurse: p.purse,
              squad: p.squad,
            })),
            soldLog: room.auction.soldLog,
          },
          null,
          2
        )
      );
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `cricketverse_auction_${room.code}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Auction results exported as JSON!', 'success');
  };

  // COMPLETED AUCTION BANNER -> UNLOCK CRICKET GAME!
  if (room.status === 'completed' || auction.status === 'completed') {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <Trophy className="w-14 h-14 text-amber-400 mx-auto animate-bounce" />
          <h1 className="text-3xl font-black text-white">IPL Auction Completed!</h1>
          <p className="text-slate-300 max-w-xl mx-auto text-sm">
            All franchises have locked in their squads. Your custom-built IPL teams are now unlocked for{' '}
            <span className="text-emerald-400 font-bold">Swipe-Based Stadium Cricket Matches</span>!
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('my-team')}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700"
            >
              Manage Playing XI & Captain
            </button>
            <button
              onClick={() =>
                navigate('cricket-game', {
                  matchConfig: { mode: 'auction', roomId: room.id },
                })
              }
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30"
            >
              <Play className="w-4 h-4" /> Play Match With Auction Teams →
            </button>
            <button
              onClick={handleExportResults}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold"
            >
              <Download className="w-4 h-4" /> Export JSON
            </button>
          </div>
        </div>

        {/* Final Franchise Squads Summary */}
        <div className="grid md:grid-cols-2 gap-4">
          {room.participants.map((p) => {
            const team = IPL_TEAMS.find((t) => t.id === p.teamId);
            return (
              <div key={p.userId} className="bg-[#0F172A] border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{team?.badge || '🏏'}</span>
                    <div>
                      <h3 className="font-bold text-white">{team?.name || p.username}</h3>
                      <p className="text-xs text-slate-400">Owner: {p.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-400">₹{p.purse} Cr left</div>
                    <div className="text-xs text-slate-400">{p.squad.length} Players</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {p.squad.map((pl) => (
                    <div
                      key={pl.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 text-xs"
                    >
                      <span className="truncate text-slate-200">{pl.name}</span>
                      <span className="text-amber-400 font-bold ml-1">₹{pl.soldPrice}Cr</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const nextBidAmount = auction.highestBidderId
    ? Number((auction.currentBid + room.settings.bidIncrement).toFixed(2))
    : currentPlayer?.basePrice || 0;

  return (
    <div className="space-y-5">
      {/* Auction Top Status Strip */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-sm">
            ROOM {room.code}
          </span>
          <div>
            <h1 className="font-black text-white text-base sm:text-lg">{room.name}</h1>
            <p className="text-xs text-slate-400">
              Lot #{auction.currentIndex + 1} of {auction.playerPool.length} • Increment: ₹
              {room.settings.bidIncrement} Cr
            </p>
          </div>
        </div>

        {/* Host Live Auction Controls */}
        {isHost && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                roomManager.updateRoom(room.id, (r) => ({
                  ...r,
                  auction: {
                    ...r.auction,
                    status: r.auction.status === 'paused' ? 'active' : 'paused',
                  },
                }))
              }
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold"
            >
              {auction.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {auction.status === 'paused' ? 'Resume' : 'Pause'}
            </button>

            <button
              onClick={finalizeCurrentLot}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold"
            >
              <Gavel className="w-3.5 h-3.5" /> Hammer Now
            </button>

            <button
              onClick={advanceToNextPlayer}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip Player
            </button>

            <button
              onClick={() => setShowAddPlayerModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Player
            </button>

            <button
              onClick={handleQuickCompleteAuction}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold"
            >
              <Zap className="w-3.5 h-3.5" /> Auto-Draft & Finish
            </button>
          </div>
        )}
      </div>

      {/* Main 3-Column Live Auction Stage */}
      <div className="grid lg:grid-cols-12 gap-5">
        {/* Left 3 Cols: Franchise Purse & Squad Tracker */}
        <div className="lg:col-span-3 bg-[#0F172A] border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Franchise Standings</h2>
          <div className="space-y-2.5">
            {room.participants.map((p) => {
              const t = IPL_TEAMS.find((team) => team.id === p.teamId);
              const isLeading = auction.highestBidderId === p.userId;
              return (
                <div
                  key={p.userId}
                  className={`p-3 rounded-xl border transition-all ${
                    isLeading
                      ? 'bg-emerald-950/50 border-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>{t?.badge || '🏏'}</span>
                      <span>{t?.short || p.username}</span>
                    </span>
                    <span className="text-xs font-black text-emerald-400">₹{p.purse} Cr</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span className="truncate max-w-[110px]">{p.username}</span>
                    <span>
                      Squad: {p.squad.length}/{room.settings.maxSquadSize}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center 6 Cols: Active Player Spotlight & Bidding Paddle */}
        <div className="lg:col-span-6 space-y-4">
          {/* SOLD / UNSOLD Overlay Banner */}
          {auction.lastResult && (
            <div
              className={`p-5 rounded-2xl border-2 text-center animate-pulse ${
                auction.lastResult.type === 'SOLD'
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                  : 'bg-rose-950/90 border-rose-500 text-rose-200'
              }`}
            >
              <div className="text-2xl font-black tracking-widest">
                {auction.lastResult.type === 'SOLD'
                  ? `🔨 SOLD TO ${auction.lastResult.teamId}!`
                  : '❌ UNSOLD'}
              </div>
              <div className="text-sm mt-1 font-semibold">
                {auction.lastResult.player.name}{' '}
                {auction.lastResult.type === 'SOLD' ? `for ₹${auction.lastResult.price} Cr` : ''}
              </div>
            </div>
          )}

          {currentPlayer && (
            <div className="bg-gradient-to-b from-[#111A2E] to-[#0B1120] border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-6">
              {/* Player Card Header + Timer */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-emerald-500/20 border border-amber-400/30 flex items-center justify-center text-4xl shadow-inner">
                    {currentPlayer.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[11px] font-bold uppercase">
                        {currentPlayer.role}
                      </span>
                      <span className="text-xs text-slate-400">
                        {currentPlayer.country} • {currentPlayer.age} yrs
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">{currentPlayer.name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {currentPlayer.batStyle} Bat • {currentPlayer.bowlStyle}
                    </p>
                  </div>
                </div>

                {/* Live Countdown Ring */}
                <div
                  className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center shrink-0 ${
                    auction.timer <= 5
                      ? 'border-rose-500 bg-rose-950/50 text-rose-300 animate-pulse'
                      : 'border-amber-400/60 bg-slate-900 text-amber-300'
                  }`}
                >
                  <span className="text-2xl font-black leading-none">{auction.timer}</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider mt-0.5">SEC</span>
                </div>
              </div>

              {/* Player Ratings Bars */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                {[
                  { label: 'BATTING', val: currentPlayer.bat, color: 'bg-emerald-400' },
                  { label: 'BOWLING', val: currentPlayer.bowl, color: 'bg-amber-400' },
                  { label: 'FIELDING', val: currentPlayer.field, color: 'bg-sky-400' },
                ].map((stat) => (
                  <div key={stat.label} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-400">{stat.label}</span>
                      <span className="text-white">{stat.val}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${stat.color}`} style={{ width: `${stat.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Current Bid Display */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-400">
                    {auction.highestBidderId ? 'Current Highest Bid' : 'Base Price'}
                  </div>
                  <div className="text-3xl font-black text-amber-400 mt-0.5">₹{auction.currentBid} Cr</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold uppercase text-slate-400">Highest Bidder</div>
                  <div className="text-base font-black text-emerald-400 mt-1 truncate">
                    {auction.highestBidderTeamId
                      ? `${auction.highestBidderTeamId} (${auction.highestBidderName})`
                      : 'No Bids Yet'}
                  </div>
                </div>
              </div>

              {/* Raise Paddle Action Buttons */}
              <div className="space-y-2.5">
                <button
                  disabled={auction.status !== 'active' || auction.highestBidderId === currentUser?.id}
                  onClick={() => handlePlaceBid()}
                  className={`w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
                    auction.highestBidderId === currentUser?.id
                      ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-300 cursor-default'
                      : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-110 text-slate-950 shadow-amber-500/25'
                  }`}
                >
                  <Gavel className="w-5 h-5" />
                  {auction.highestBidderId === currentUser?.id
                    ? `You Hold Highest Bid (₹${auction.currentBid} Cr)`
                    : `Raise Paddle • Bid ₹${nextBidAmount} Cr (${myTeam?.short || 'Your Team'})`}
                </button>

                {auction.highestBidderId && auction.highestBidderId !== currentUser?.id && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handlePlaceBid(1.0)}
                      className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700"
                    >
                      Jump +₹1.00 Cr
                    </button>
                    <button
                      onClick={() => handlePlaceBid(2.0)}
                      className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs border border-slate-700"
                    >
                      Power Jump +₹2.00 Cr
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 3 Cols: Live Bidding Feed & Recent Sales */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Live Bid Feed</h3>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {auction.bidHistory.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Waiting for opening bid...</p>
              ) : (
                auction.bidHistory.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{b.teamId || b.bidderName}</span>
                      <span className="text-[10px] text-slate-500 block">{b.time}</span>
                    </div>
                    <span className="font-black text-amber-400">₹{b.amount} Cr</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Recent Hammer Sales</h3>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {auction.soldLog.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">No players sold yet.</p>
              ) : (
                auction.soldLog.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-900/70">
                    <span className="truncate text-slate-200">{s.playerName}</span>
                    <span className="text-emerald-400 font-bold ml-2 shrink-0">
                      {s.teamId} ₹{s.price}Cr
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Host Modal: Add Custom Player to Pool */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Add Custom Player to Auction</h3>
              <button onClick={() => setShowAddPlayerModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Player Full Name"
              value={customPlayerName}
              onChange={(e) => setCustomPlayerName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={customPlayerRole}
                onChange={(e) => setCustomPlayerRole(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
              >
                <option value="Batter">Batter</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="WK-Batter">WK-Batter</option>
              </select>
              <input
                type="number"
                step="0.25"
                min="0.25"
                value={customBasePrice}
                onChange={(e) => setCustomBasePrice(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
              />
            </div>
            <button
              onClick={() => {
                if (!customPlayerName.trim()) return;
                const newPl = {
                  id: `PC_${Date.now()}`,
                  name: customPlayerName.trim(),
                  country: 'India',
                  age: 24,
                  role: customPlayerRole,
                  batStyle: 'Right-hand',
                  bowlStyle: 'Right-arm Medium',
                  bat: customPlayerRole === 'Bowler' ? 45 : 86,
                  bowl: customPlayerRole === 'Batter' ? 30 : 86,
                  field: 85,
                  basePrice: customBasePrice,
                  avatar: '⭐',
                };
                roomManager.updateRoom(room.id, (r) => {
                  const pool = [...r.auction.playerPool];
                  pool.splice(r.auction.currentIndex + 1, 0, newPl);
                  return { ...r, auction: { ...r.auction, playerPool: pool } };
                });
                setCustomPlayerName('');
                setShowAddPlayerModal(false);
                showToast(`Added ${newPl.name} as next lot!`, 'success');
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
            >
              Insert Next in Auction Pool
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 10. MY SQUAD & PLAYING XI MANAGER VIEW
// ============================================================================
function TeamSquadView({ rooms, currentUser, navigate, showToast }) {
  const userRoomsWithSquads = rooms.filter((r) =>
    r.participants.some((p) => p.userId === currentUser?.id && p.squad.length > 0)
  );
  const [selectedRoomId, setSelectedRoomId] = useState(userRoomsWithSquads[0]?.id || '');

  const activeRoom =
    rooms.find((r) => r.id === selectedRoomId) || userRoomsWithSquads[0] || null;
  const participant = activeRoom?.participants.find((p) => p.userId === currentUser?.id);
  const team = IPL_TEAMS.find((t) => t.id === participant?.teamId);

  if (!activeRoom || !participant) {
    return (
      <div className="max-w-xl mx-auto bg-[#0F172A] border border-slate-800 rounded-3xl p-8 text-center space-y-4">
        <Shield className="w-12 h-12 text-emerald-400 mx-auto" />
        <h2 className="text-xl font-black text-white">No Auction Squad Found Yet</h2>
        <p className="text-sm text-slate-400">
          Complete an IPL Auction in any room to assemble your 12-player franchise squad and customize your Playing XI.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate('create-room')}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
          >
            Create Auction Room
          </button>
          <button
            onClick={() => navigate('cricket-game')}
            className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs"
          >
            Play Quick Match
          </button>
        </div>
      </div>
    );
  }

  const playingXIIds =
    participant.playingXI?.length > 0
      ? participant.playingXI
      : participant.squad.slice(0, 11).map((p) => p.id);

  const togglePlayingXI = (playerId) => {
    let updatedXI;
    if (playingXIIds.includes(playerId)) {
      updatedXI = playingXIIds.filter((id) => id !== playerId);
    } else {
      if (playingXIIds.length >= 11) {
        return showToast('Playing XI already has 11 players. Deselect one first.', 'error');
      }
      updatedXI = [...playingXIIds, playerId];
    }
    roomManager.updateParticipant(activeRoom.id, currentUser.id, { playingXI: updatedXI });
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            style={{ backgroundColor: team?.primary || '#10B981' }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
          >
            {team?.badge || '🏏'}
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{team?.name || 'My Franchise'}</h1>
            <p className="text-xs text-slate-400">
              Room: {activeRoom.name} ({activeRoom.code}) • Purse Remaining: ₹{participant.purse} Cr • Playing XI:{' '}
              <span className="text-emerald-400 font-bold">{playingXIIds.length}/11</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userRoomsWithSquads.length > 1 && (
            <select
              value={activeRoom.id}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            >
              {userRoomsWithSquads.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() =>
              navigate('cricket-game', {
                matchConfig: { mode: 'auction', roomId: activeRoom.id },
              })
            }
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs"
          >
            <Play className="w-4 h-4" /> Take Squad to Match →
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {participant.squad.map((player) => {
          const inXI = playingXIIds.includes(player.id);
          const isCaptain = participant.captainId === player.id;
          const isKeeper = participant.keeperId === player.id;

          return (
            <div
              key={player.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                inXI ? 'bg-slate-900 border-emerald-500/40' : 'bg-slate-950/60 border-slate-800/70 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{player.avatar}</span>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                      {player.name}
                      {isCaptain && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black">
                          C
                        </span>
                      )}
                      {isKeeper && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 text-[10px] font-black">
                          WK
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {player.role} • Bought: ₹{player.soldPrice} Cr
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-slate-950 px-3 py-2 rounded-xl">
                <span>BAT: <strong className="text-emerald-400">{player.bat}</strong></span>
                <span>BOWL: <strong className="text-amber-400">{player.bowl}</strong></span>
                <span>FLD: <strong className="text-sky-400">{player.field}</strong></span>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => togglePlayingXI(player.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                    inXI ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {inXI ? 'In Playing XI ✓' : '+ Add to XI'}
                </button>
                <button
                  onClick={() => {
                    roomManager.updateParticipant(activeRoom.id, currentUser.id, { captainId: player.id });
                    showToast(`${player.name} appointed Captain!`, 'success');
                  }}
                  className={`px-2.5 py-2 rounded-lg text-xs font-bold ${
                    isCaptain ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400'
                  }`}
                  title="Make Captain"
                >
                  C
                </button>
                <button
                  onClick={() => {
                    roomManager.updateParticipant(activeRoom.id, currentUser.id, { keeperId: player.id });
                    showToast(`${player.name} appointed Wicketkeeper!`, 'success');
                  }}
                  className={`px-2.5 py-2 rounded-lg text-xs font-bold ${
                    isKeeper ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-sky-400'
                  }`}
                  title="Make Wicketkeeper"
                >
                  WK
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 11. SWIPE-BASED CRICKET GAME (Interactive Pitch Canvas + Batting & Bowling)
// ============================================================================
function CricketGameView({ rooms, currentUser, initialMatchConfig, onMatchComplete, navigate, showToast }) {
  const completedRooms = rooms.filter((r) => r.participants.some((p) => p.squad.length > 0));

  // Match Setup State
  const [gameMode, setGameMode] = useState(initialMatchConfig?.mode || 'auction');
  const [selectedRoomId, setSelectedRoomId] = useState(
    initialMatchConfig?.roomId || completedRooms[0]?.id || ''
  );
  const [oversPerInnings, setOversPerInnings] = useState(2); // 2 or 5 overs quick playable default
  const [teamAId, setTeamAId] = useState('CSK');
  const [teamBId, setTeamBId] = useState('MI');
  const [playerSide, setPlayerSide] = useState('TEAM_A'); // 'TEAM_A' | 'TEAM_B' | 'PASS_AND_PLAY'

  // Active Match State
  const [matchState, setMatchState] = useState(null);

  // Interactive Delivery & Swipe Physics State
  const [phase, setPhase] = useState('READY'); // 'READY' | 'BOWLING_SELECT' | 'BALL_IN_FLIGHT' | 'SHOT_ANIM' | 'INNINGS_BREAK' | 'MATCH_OVER'
  const [ballProgress, setBallProgress] = useState(0); // 0 = bowler release, 1 = batter crease
  const [shotAnimData, setShotAnimData] = useState(null);
  const [deliveryConfig, setDeliveryConfig] = useState({
    type: 'Good Length',
    line: 'Off',
    speed: 138,
  });

  // Touch / Mouse Swipe Tracking
  const swipeStartRef = useRef(null);
  const pressTimerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const canvasRef = useRef(null);

  // Sync default teams when selectedRoomId changes
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || completedRooms[0] || null;

  useEffect(() => {
    if (selectedRoom && selectedRoom.participants.length >= 1) {
      const p1Team = selectedRoom.participants[0]?.teamId || 'CSK';
      const p2Team = selectedRoom.participants[1]?.teamId || (p1Team === 'CSK' ? 'MI' : 'CSK');
      setTeamAId(p1Team);
      setTeamBId(p2Team);
    }
  }, [selectedRoom]);

  // Start a Full 2-Innings Cricket Match
  const handleStartMatch = () => {
    let squadA = [];
    let squadB = [];
    let nameA = IPL_TEAMS.find((t) => t.id === teamAId)?.name || 'Team A';
    let nameB = IPL_TEAMS.find((t) => t.id === teamBId)?.name || 'Team B';

    if ((gameMode === 'auction' || gameMode === 'multiplayer') && selectedRoom) {
      const partA = selectedRoom.participants.find((p) => p.teamId === teamAId) || selectedRoom.participants[0];
      const partB =
        selectedRoom.participants.find((p) => p.teamId === teamBId && p.userId !== partA?.userId) ||
        selectedRoom.participants[1];

      if (partA && partA.squad.length > 0) {
        const xiIds = partA.playingXI?.length ? partA.playingXI : partA.squad.map((s) => s.id);
        squadA = partA.squad.filter((s) => xiIds.includes(s.id));
        if (squadA.length < 11) squadA = [...squadA, ...partA.squad.filter((s) => !xiIds.includes(s.id))].slice(0, 11);
        nameA = `${IPL_TEAMS.find((t) => t.id === partA.teamId)?.short || 'T1'} (${partA.username})`;
      }
      if (partB && partB.squad.length > 0) {
        const xiIds = partB.playingXI?.length ? partB.playingXI : partB.squad.map((s) => s.id);
        squadB = partB.squad.filter((s) => xiIds.includes(s.id));
        if (squadB.length < 11) squadB = [...squadB, ...partB.squad.filter((s) => !xiIds.includes(s.id))].slice(0, 11);
        nameB = `${IPL_TEAMS.find((t) => t.id === partB.teamId)?.short || 'T2'} (${partB.username})`;
      }
    }

    if (squadA.length === 0) squadA = buildAutoSquad(teamAId);
    if (squadB.length === 0) squadB = buildAutoSquad(teamBId, squadA.map((p) => p.id));

    const maxOvers = gameMode === 'super_over' ? 1 : oversPerInnings;

    const initialMatch = {
      mode: gameMode,
      maxOvers,
      innings: 1,
      target: null,
      battingTeam: { id: teamAId, name: nameA, squad: squadA },
      bowlingTeam: { id: teamBId, name: nameB, squad: squadB },
      score: 0,
      wickets: 0,
      ballsBowled: 0,
      strikerIdx: 0,
      nonStrikerIdx: 1,
      nextBatterIdx: 2,
      bowlerIdx: squadB.length - 1,
      innings1Summary: null,
      batterStats: {},
      bowlerStats: {},
      recentBalls: [],
      commentary: `Innings 1 underway! ${nameA} take the crease against ${nameB}.`,
      winnerText: null,
    };

    setMatchState(initialMatch);
    setPhase('READY');
    setBallProgress(0);
    setShotAnimData(null);
    sound.bid();
  };

  // Determine whether user is currently batting or bowling
  const isUserBatting = useMemo(() => {
    if (!matchState) return true;
    if (playerSide === 'PASS_AND_PLAY') return true;
    if (matchState.innings === 1) return playerSide === 'TEAM_A';
    return playerSide === 'TEAM_B';
  }, [matchState, playerSide]);

  // Bowl Delivery Animation Loop
  const triggerDelivery = () => {
    if (!matchState || phase !== 'READY') return;
    setShotAnimData(null);
    setBallProgress(0);
    setPhase('BALL_IN_FLIGHT');
  };

  useEffect(() => {
    if (phase !== 'BALL_IN_FLIGHT') return;
    let animId;
    let start = performance.now();
    const flightDuration = 1450; // 1.45 seconds ball travel so user has crisp swipe timing window

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1.15, elapsed / flightDuration);
      setBallProgress(progress);

      if (progress >= 1.15) {
        // User didn't swipe in time -> automatic dot ball or bowled!
        resolveShot('MISS', 12);
      } else {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [phase]);

  // Resolve Shot & Update Match Scoreboard
  const resolveShot = useCallback(
    (swipeDir, overrideTiming = null) => {
      if (!matchState) return;

      // Sweet spot for ballProgress is around 0.85 (when ball reaches batting crease)
      const timingError = Math.abs(ballProgress - 0.85);
      const computedTiming =
        overrideTiming !== null
          ? overrideTiming
          : Math.max(10, Math.min(100, Math.round(100 - timingError * 175)));

      const striker = matchState.battingTeam.squad[matchState.strikerIdx] || matchState.battingTeam.squad[0];
      const bowler = matchState.bowlingTeam.squad[matchState.bowlerIdx] || matchState.bowlingTeam.squad[0];

      const outcome = simulateDeliveryOutcome({
        batter: striker,
        bowler,
        swipeDirection: swipeDir === 'MISS' ? 'TAP' : swipeDir,
        timingScore: swipeDir === 'MISS' ? 14 : computedTiming,
        deliveryType: deliveryConfig.type,
        line: deliveryConfig.line,
      });

      // Play appropriate Web Audio effect
      if (outcome.isWicket) {
        sound.wicket();
      } else if (outcome.runs === 6) {
        sound.six();
      } else if (outcome.runs === 4) {
        sound.four();
      } else if (outcome.runs > 0) {
        sound.batHit(0.7);
      } else {
        sound.batHit(0.3);
      }

      setShotAnimData({
        ...outcome,
        progress: 0,
      });
      setPhase('SHOT_ANIM');

      // Update match stats
      setMatchState((prev) => {
        if (!prev) return prev;
        const nextScore = prev.score + outcome.runs;
        const nextWickets = prev.wickets + (outcome.isWicket ? 1 : 0);
        const nextBalls = prev.ballsBowled + 1;
        const maxBalls = prev.maxOvers * 6;

        // Update Batter Stats
        const prevBat = prev.batterStats[striker.id] || {
          name: striker.name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          out: false,
        };
        const updatedBat = {
          ...prevBat,
          runs: prevBat.runs + outcome.runs,
          balls: prevBat.balls + 1,
          fours: prevBat.fours + (outcome.runs === 4 ? 1 : 0),
          sixes: prevBat.sixes + (outcome.runs === 6 ? 1 : 0),
          out: outcome.isWicket ? true : prevBat.out,
        };

        // Update Bowler Stats
        const prevBowl = prev.bowlerStats[bowler.id] || {
          name: bowler.name,
          balls: 0,
          runs: 0,
          wickets: 0,
        };
        const updatedBowl = {
          ...prevBowl,
          balls: prevBowl.balls + 1,
          runs: prevBowl.runs + outcome.runs,
          wickets: prevBowl.wickets + (outcome.isWicket ? 1 : 0),
        };

        // Rotate strike on odd runs or end of over
        let sIdx = prev.strikerIdx;
        let nsIdx = prev.nonStrikerIdx;
        let nextBatIdx = prev.nextBatterIdx;

        if (outcome.isWicket) {
          sIdx = nextBatIdx;
          nextBatIdx += 1;
        } else if (outcome.runs % 2 === 1) {
          [sIdx, nsIdx] = [nsIdx, sIdx];
        }

        // Rotate bowler & strike at end of over
        let bIdx = prev.bowlerIdx;
        if (nextBalls % 6 === 0) {
          [sIdx, nsIdx] = [nsIdx, sIdx];
          bIdx = bIdx - 1 < 6 ? prev.bowlingTeam.squad.length - 1 : bIdx - 1;
        }

        const ballBadge = outcome.isWicket ? 'W' : outcome.runs === 0 ? '•' : String(outcome.runs);
        const recentBalls = [...prev.recentBalls.slice(-11), ballBadge];

        const allOut = nextWickets >= Math.min(10, prev.battingTeam.squad.length - 1);
        const oversDone = nextBalls >= maxBalls;
        const targetChased = prev.innings === 2 && prev.target !== null && nextScore >= prev.target;

        // Check Innings / Match Completion
        if (prev.innings === 1 && (allOut || oversDone)) {
          setTimeout(() => setPhase('INNINGS_BREAK'), 1300);
          return {
            ...prev,
            score: nextScore,
            wickets: nextWickets,
            ballsBowled: nextBalls,
            recentBalls,
            batterStats: { ...prev.batterStats, [striker.id]: updatedBat },
            bowlerStats: { ...prev.bowlerStats, [bowler.id]: updatedBowl },
            innings1Summary: {
              teamName: prev.battingTeam.name,
              score: nextScore,
              wickets: nextWickets,
              overs: `${Math.floor(nextBalls / 6)}.${nextBalls % 6}`,
            },
            commentary: `End of Innings 1! ${prev.battingTeam.name} posted ${nextScore}/${nextWickets}. Target: ${
              nextScore + 1
            }.`,
          };
        }

        if (prev.innings === 2 && (targetChased || allOut || oversDone)) {
          let winnerText = '';
          if (targetChased) {
            const wicketsLeft = 10 - nextWickets;
            winnerText = `${prev.battingTeam.name} won by ${wicketsLeft} wickets!`;
          } else if (nextScore === prev.target - 1) {
            winnerText = `Match Tied! (${nextScore} vs ${prev.target - 1})`;
          } else {
            const margin = prev.target - 1 - nextScore;
            winnerText = `${prev.bowlingTeam.name} won by ${margin} runs!`;
          }

          sound.victory();
          setTimeout(() => setPhase('MATCH_OVER'), 1300);

          const finalState = {
            ...prev,
            score: nextScore,
            wickets: nextWickets,
            ballsBowled: nextBalls,
            recentBalls,
            batterStats: { ...prev.batterStats, [striker.id]: updatedBat },
            bowlerStats: { ...prev.bowlerStats, [bowler.id]: updatedBowl },
            winnerText,
            commentary: `MATCH OVER! ${winnerText}`,
          };

          // Persist match history record
          onMatchComplete?.({
            id: `match_${Date.now()}`,
            date: new Date().toLocaleDateString(),
            mode: prev.mode,
            teamA: prev.innings1Summary?.teamName || prev.bowlingTeam.name,
            scoreA: `${prev.innings1Summary?.score || 0}/${prev.innings1Summary?.wickets || 0}`,
            teamB: prev.battingTeam.name,
            scoreB: `${nextScore}/${nextWickets}`,
            winnerText,
            batterStats: finalState.batterStats,
            bowlerStats: finalState.bowlerStats,
          });

          return finalState;
        }

        setTimeout(() => {
          setPhase('READY');
          setBallProgress(0);
        }, 1250);

        return {
          ...prev,
          score: nextScore,
          wickets: nextWickets,
          ballsBowled: nextBalls,
          strikerIdx: sIdx,
          nonStrikerIdx: nsIdx,
          nextBatterIdx: nextBatIdx,
          bowlerIdx: bIdx,
          recentBalls,
          batterStats: { ...prev.batterStats, [striker.id]: updatedBat },
          bowlerStats: { ...prev.bowlerStats, [bowler.id]: updatedBowl },
          commentary: outcome.commentary,
        };
      });
    },
    [matchState, ballProgress, deliveryConfig, onMatchComplete]
  );

  // Start 2nd Innings
  const startSecondInnings = () => {
    setMatchState((prev) => {
      if (!prev) return prev;
      const target = prev.score + 1;
      return {
        ...prev,
        innings: 2,
        target,
        battingTeam: prev.bowlingTeam,
        bowlingTeam: prev.battingTeam,
        score: 0,
        wickets: 0,
        ballsBowled: 0,
        strikerIdx: 0,
        nonStrikerIdx: 1,
        nextBatterIdx: 2,
        bowlerIdx: prev.battingTeam.squad.length - 1,
        recentBalls: [],
        commentary: `Innings 2 begins! ${prev.bowlingTeam.name} need ${target} runs to win.`,
      };
    });
    setPhase('READY');
    setBallProgress(0);
    setShotAnimData(null);
  };

  // Swipe Gesture Handlers on Stadium Pitch Canvas
  const handlePointerDown = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    swipeStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    isLongPressRef.current = false;

    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
    }, 320);
  };

  const handlePointerUp = (e) => {
    clearTimeout(pressTimerRef.current);
    if (!swipeStartRef.current) return;

    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const dx = clientX - swipeStartRef.current.x;
    const dy = clientY - swipeStartRef.current.y;
    const dist = Math.hypot(dx, dy);
    swipeStartRef.current = null;

    if (phase === 'READY') {
      triggerDelivery();
      return;
    }

    if (phase !== 'BALL_IN_FLIGHT') return;

    if (isLongPressRef.current && dist < 25) {
      resolveShot('POWER');
      return;
    }

    if (dist < 22) {
      resolveShot('TAP');
      return;
    }

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle >= -115 && angle <= -65) {
      resolveShot('UP');
    } else if (angle > 65 && angle < 115) {
      resolveShot('DOWN');
    } else if (angle > -65 && angle < -20) {
      resolveShot('DIAG_RIGHT');
    } else if (angle >= -160 && angle < -115) {
      resolveShot('DIAG_LEFT');
    } else if (Math.abs(angle) <= 20) {
      resolveShot('RIGHT');
    } else {
      resolveShot('LEFT');
    }
  };

  // Render Interactive HTML5 Stadium Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matchState) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // 1. Stadium Outfield Grass
    const grad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.55);
    grad.addColorStop(0, '#15803d');
    grad.addColorStop(0.7, '#166534');
    grad.addColorStop(1, '#052e16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 2. Boundary Rope & 30-yard Inner Circle
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(W / 2, H / 2, W * 0.45, H * 0.43, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(W / 2, H / 2, W * 0.28, H * 0.27, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Central 22-Yard Clay Pitch
    const pitchW = 54;
    const pitchH = H * 0.42;
    const pitchX = W / 2 - pitchW / 2;
    const pitchY = H / 2 - pitchH / 2;
    ctx.fillStyle = '#d6b88d';
    ctx.fillRect(pitchX, pitchY, pitchW, pitchH);

    // Batting & Bowling Crease Lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pitchX - 6, pitchY + 22);
    ctx.lineTo(pitchX + pitchW + 6, pitchY + 22);
    ctx.moveTo(pitchX - 6, pitchY + pitchH - 22);
    ctx.lineTo(pitchX + pitchW + 6, pitchY + pitchH - 22);
    ctx.stroke();

    // 4. Stumps (Top = Bowler End, Bottom = Striker End)
    ctx.fillStyle = '#facc15';
    [-6, 0, 6].forEach((offset) => {
      ctx.fillRect(W / 2 + offset - 1.5, pitchY + 12, 3, 10);
      ctx.fillRect(W / 2 + offset - 1.5, pitchY + pitchH - 22, 3, 10);
    });

    // 5. Fielders around the ground
    const fielderCoords = [
      [0.34, 0.25], [0.66, 0.25], [0.22, 0.42], [0.78, 0.42],
      [0.24, 0.65], [0.76, 0.65], [0.36, 0.78], [0.64, 0.78], [0.5, 0.16],
    ];
    fielderCoords.forEach(([fx, fy]) => {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(W * fx, H * fy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 6. Batter Avatar at Bottom Crease
    const batterX = W / 2 - 12;
    const batterY = pitchY + pitchH - 24;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(batterX, batterY, 9, 0, Math.PI * 2);
    ctx.fill();

    // Bat swing visual
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(batterX + 4, batterY);
    if (phase === 'SHOT_ANIM') {
      ctx.lineTo(batterX + 22, batterY - 14);
    } else {
      ctx.lineTo(batterX + 10, batterY + 12);
    }
    ctx.stroke();

    // 7. Cricket Ball Trajectory
    const bowlerY = pitchY + 20;
    const targetY = pitchY + pitchH - 22;

    if (phase === 'BALL_IN_FLIGHT') {
      const lineOffset = deliveryConfig.line === 'Off' ? -10 : deliveryConfig.line === 'Leg' ? 10 : 0;
      const swingCurve =
        deliveryConfig.type === 'Swing' ? Math.sin(ballProgress * Math.PI) * 14 : 0;
      const bx = W / 2 + lineOffset * ballProgress + swingCurve;
      const by = bowlerY + (targetY - bowlerY) * Math.min(1, ballProgress);

      // Timing Sweet-Spot Ring around batter
      ctx.strokeStyle =
        ballProgress >= 0.72 && ballProgress <= 0.98 ? '#4ade80' : 'rgba(250, 204, 21, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W / 2, targetY, 22, 0, Math.PI * 2);
      ctx.stroke();

      // White/Red Cricket Ball
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (phase === 'SHOT_ANIM' && shotAnimData) {
      const rad = ((shotAnimData.ballAngle - 90) * Math.PI) / 180;
      const travel = shotAnimData.ballDistance * (W * 0.43);
      const endX = W / 2 + Math.cos(rad) * travel;
      const endY = targetY + Math.sin(rad) * travel;

      // Shot Trail Line
      ctx.strokeStyle =
        shotAnimData.runs === 6
          ? '#facc15'
          : shotAnimData.runs === 4
          ? '#4ade80'
          : shotAnimData.isWicket
          ? '#f43f5e'
          : '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2, targetY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(endX, endY, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [matchState, phase, ballProgress, shotAnimData, deliveryConfig]);

  // Pre-Match Setup Screen
  if (!matchState) {
    return (
      <div className="max-w-3xl mx-auto bg-[#0F172A] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">CricketVerse Stadium</h1>
            <p className="text-xs text-slate-400 mt-1">
              Play with your actual IPL Auction squads in an interactive swipe-based cricket match.
            </p>
          </div>
          <span className="text-3xl">🏟️</span>
        </div>

        {/* Game Modes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: 'auction', label: 'Auction Teams', desc: 'Use drafted squads' },
            { id: 'quick', label: 'Quick Match', desc: 'Instant IPL clash' },
            { id: 'super_over', label: 'Super Over', desc: '1-Over thriller' },
            { id: 'multiplayer', label: 'Pass & Play', desc: '2-Player same browser' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setGameMode(m.id);
                if (m.id === 'multiplayer') setPlayerSide('PASS_AND_PLAY');
              }}
              className={`p-3 rounded-2xl border text-left transition-all ${
                gameMode === m.id
                  ? 'bg-emerald-500/20 border-emerald-400 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="font-bold text-xs">{m.label}</div>
              <div className="text-[10px] opacity-75 mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Select Auction Room if available */}
        {(gameMode === 'auction' || gameMode === 'multiplayer') && completedRooms.length > 0 && (
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
              Load Squads From Auction Room
            </label>
            <select
              value={selectedRoom?.id || ''}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            >
              {completedRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Code: {r.code}) — {r.participants.length} Squads Ready
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Franchise Matchup & Overs */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Batting First</label>
            <select
              value={teamAId}
              onChange={(e) => setTeamAId(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            >
              {IPL_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.badge} {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Bowling First</label>
            <select
              value={teamBId}
              onChange={(e) => setTeamBId(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            >
              {IPL_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.badge} {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Match Format</label>
            <select
              value={oversPerInnings}
              onChange={(e) => setOversPerInnings(Number(e.target.value))}
              className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            >
              <option value={1}>1 Over (Super Over)</option>
              <option value={2}>2 Overs (Blitz)</option>
              <option value={5}>5 Overs (Standard IPL)</option>
              <option value={10}>10 Overs (T10)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleStartMatch}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/25"
        >
          🏏 Toss & Start Match
        </button>
      </div>
    );
  }

  // Active Match Interface
  const striker = matchState.battingTeam.squad[matchState.strikerIdx] || matchState.battingTeam.squad[0];
  const nonStriker = matchState.battingTeam.squad[matchState.nonStrikerIdx] || matchState.battingTeam.squad[1];
  const bowler = matchState.bowlingTeam.squad[matchState.bowlerIdx] || matchState.bowlingTeam.squad[0];
  const oversText = `${Math.floor(matchState.ballsBowled / 6)}.${matchState.ballsBowled % 6}`;
  const crr =
    matchState.ballsBowled > 0 ? ((matchState.score / matchState.ballsBowled) * 6).toFixed(2) : '0.00';
  const ballsLeft = matchState.maxOvers * 6 - matchState.ballsBowled;
  const runsNeeded = matchState.target ? Math.max(0, matchState.target - matchState.score) : null;
  const rrr =
    runsNeeded !== null && ballsLeft > 0 ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : '0.00';

  return (
    <div className="space-y-4">
      {/* Live TV Broadcast Scoreboard */}
      <div className="bg-gradient-to-r from-[#0B1120] via-[#111C33] to-[#0B1120] border border-slate-700/80 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase">
              INN {matchState.innings}
            </span>
            <div>
              <div className="text-xs text-slate-400 font-semibold">{matchState.battingTeam.name}</div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {matchState.score}/{matchState.wickets}{' '}
                <span className="text-sm font-bold text-amber-400">
                  ({oversText}/{matchState.maxOvers} ov)
                </span>
              </div>
            </div>
          </div>

          {/* Target & Run Rate */}
          <div className="flex items-center gap-5 text-xs">
            <div>
              <span className="text-slate-400 block">CRR</span>
              <span className="font-black text-white text-sm">{crr}</span>
            </div>
            {matchState.target !== null && (
              <>
                <div>
                  <span className="text-slate-400 block">TARGET</span>
                  <span className="font-black text-amber-400 text-sm">{matchState.target}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">NEED</span>
                  <span className="font-black text-emerald-400 text-sm">
                    {runsNeeded} off {ballsLeft}b (RRR {rrr})
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Over Timeline Pills */}
          <div className="flex items-center gap-1.5">
            {matchState.recentBalls.map((b, i) => (
              <span
                key={i}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  b === 'W'
                    ? 'bg-rose-500 text-white'
                    : b === '6'
                    ? 'bg-amber-400 text-slate-950'
                    : b === '4'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Commentary Ticker */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-emerald-300 font-medium">🎙️ {matchState.commentary}</span>
          <button
            onClick={() => setMatchState(null)}
            className="text-slate-400 hover:text-rose-400 font-semibold ml-3 shrink-0"
          >
            Exit Match
          </button>
        </div>
      </div>

      {/* Main Game Arena: Pitch Canvas + Controls */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">
        {/* Interactive Pitch Canvas (7 Cols) */}
        <div className="lg:col-span-7 bg-[#0F172A] border border-slate-800 rounded-3xl p-4 flex flex-col items-center space-y-3 relative">
          <div className="w-full flex items-center justify-between text-xs px-1">
            <span className="text-slate-300 font-bold">
              🏏 {striker?.name}* ({matchState.batterStats[striker?.id]?.runs || 0} off{' '}
              {matchState.batterStats[striker?.id]?.balls || 0})
            </span>
            <span className="text-amber-300 font-bold">
              ⚾ {bowler?.name} ({matchState.bowlerStats[bowler?.id]?.wickets || 0}-
              {matchState.bowlerStats[bowler?.id]?.runs || 0})
            </span>
          </div>

          {/* HTML5 Interactive Swipe Canvas */}
          <div
            onMouseDown={handlePointerDown}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchEnd={handlePointerUp}
            className="relative w-full max-w-[440px] aspect-square rounded-2xl overflow-hidden border-2 border-slate-700 cursor-crosshair select-none shadow-2xl"
          >
            <canvas ref={canvasRef} width={440} height={440} className="w-full h-full block" />

            {/* Shot Result Callout Overlay */}
            {phase === 'SHOT_ANIM' && shotAnimData && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`px-6 py-3 rounded-2xl font-black text-2xl shadow-2xl border-2 ${
                    shotAnimData.isWicket
                      ? 'bg-rose-950/90 border-rose-400 text-rose-200'
                      : shotAnimData.runs >= 4
                      ? 'bg-amber-950/90 border-amber-400 text-amber-300'
                      : 'bg-slate-900/90 border-emerald-400 text-emerald-300'
                  }`}
                >
                  {shotAnimData.isWicket
                    ? `OUT! ${shotAnimData.wicketType}`
                    : shotAnimData.runs === 6
                    ? 'SIX RUNS! 🚀'
                    : shotAnimData.runs === 4
                    ? 'FOUR RUNS! ⚡'
                    : `${shotAnimData.runs} RUN${shotAnimData.runs === 1 ? '' : 'S'}`}
                </div>
              </div>
            )}

            {/* Innings Break Overlay */}
            {phase === 'INNINGS_BREAK' && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <h3 className="text-2xl font-black text-amber-400">Innings Break</h3>
                <p className="text-sm text-slate-300">
                  {matchState.innings1Summary?.teamName} scored{' '}
                  <strong>
                    {matchState.innings1Summary?.score}/{matchState.innings1Summary?.wickets}
                  </strong>
                  . Target for {matchState.bowlingTeam.name}:{' '}
                  <strong className="text-emerald-400">{matchState.score + 1}</strong>
                </p>
                <button
                  onClick={startSecondInnings}
                  className="px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm"
                >
                  Start 2nd Innings Chase →
                </button>
              </div>
            )}

            {/* Match Over Overlay */}
            {phase === 'MATCH_OVER' && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <Trophy className="w-12 h-12 text-amber-400" />
                <h3 className="text-2xl font-black text-white">{matchState.winnerText}</h3>
                <div className="flex gap-3">
                  <button
                    onClick={handleStartMatch}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Rematch
                  </button>
                  <button
                    onClick={() => navigate('history')}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs"
                  >
                    View Scorecard & Stats
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Swipe directly on the pitch canvas (Up = Loft, Left = Leg, Right = Off, Down = Defend) or use the shot pad!
          </p>
        </div>

        {/* Right 5 Cols: Delivery Setup + Tactical Shot Buttons */}
        <div className="lg:col-span-5 space-y-4">
          {/* Bowler Delivery Selector */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                1. Delivery & Bowling Tactics
              </h3>
              <span className="text-[11px] text-slate-400">Bowler Skill: {bowler?.bowl}</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {['Good Length', 'Yorker', 'Bouncer', 'Swing', 'Spin', 'Full'].map((dtype) => (
                <button
                  key={dtype}
                  onClick={() => setDeliveryConfig((d) => ({ ...d, type: dtype }))}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border ${
                    deliveryConfig.type === dtype
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {dtype}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {['Off', 'Middle', 'Leg'].map((ln) => (
                <button
                  key={ln}
                  onClick={() => setDeliveryConfig((d) => ({ ...d, line: ln }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${
                    deliveryConfig.line === ln
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {ln} Stump
                </button>
              ))}
            </div>

            <button
              disabled={phase !== 'READY'}
              onClick={triggerDelivery}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 disabled:opacity-40 text-slate-950 font-black text-sm shadow-lg"
            >
              {phase === 'READY' ? '⚾ Bowl Delivery Now' : 'Ball in Play...'}
            </button>
          </div>

          {/* Instant Shot Control Pad (Accessible alongside touch/mouse swipes) */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                2. Batting Shot Controls (Tap or Swipe)
              </h3>
              <span className="text-[11px] text-slate-400">Batter Skill: {striker?.bat}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={phase !== 'BALL_IN_FLIGHT'}
                onClick={() => resolveShot('DIAG_LEFT')}
                className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-xs font-bold text-white"
              >
                ↖ Inside-Out
              </button>
              <button
                disabled={phase !== 'BALL_IN_FLIGHT'}
                onClick={() => resolveShot('UP')}
                className="py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 border border-amber-400/50 text-xs font-black text-amber-300"
              >
                ↑ Lofted Shot
              </button>
              <button
                disabled={phase !== 'BALL_IN_FLIGHT'}
                onClick={() => resolveShot('DIAG_RIGHT')}
                className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-xs font-bold text-white"
              >
                ↗ Cover Loft
              </button>

              <button
                disabled={phase !== 'BALL_IN_FLIGHT'}
                onClick={() => resolveShot('LEFT')}
                className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-xs font-bold text-white"
              >
                ← Leg Flick
              </button>
              <button
                disabled={phase !== 'BALL_IN_FLIGHT'}
                onClick={() => resolveShot('POWER')}
                className="py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 border border-rose-400/50 text-xs font-black text-rose-300"
              >
                💥 Power Hit
              </button>
              <button
                disabled={phase !== 'BALL_IN_FLIGHT'}
                onClick={() => resolveShot('RIGHT')}
                className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-xs font-bold text-white"
              >
                Off Drive →
              </button>

              <div />
              <button
                disabled={phase !== 'BALL_IN_FLIGHT'}
                onClick={() => resolveShot('DOWN')}
                className="py-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 border border-sky-400/40 text-xs font-bold text-sky-300"
              >
                ↓ Defend
              </button>
              <div />
            </div>
          </div>

          {/* Current Batters Mini Card */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>🏏 {striker?.name}* (Striker)</span>
              <span className="font-bold text-white">
                {matchState.batterStats[striker?.id]?.runs || 0} ({matchState.batterStats[striker?.id]?.balls || 0})
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>🏃 {nonStriker?.name}</span>
              <span>
                {matchState.batterStats[nonStriker?.id]?.runs || 0} (
                {matchState.batterStats[nonStriker?.id]?.balls || 0})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 12. TOURNAMENTS, POINTS TABLE & LEADERBOARD VIEW
// ============================================================================
function TournamentView({ rooms, matchHistory, navigate }) {
  const standings = useMemo(() => {
    const table = {};
    IPL_TEAMS.forEach((t) => {
      table[t.id] = { team: t, played: 0, won: 0, lost: 0, points: 0 };
    });

    matchHistory.forEach((m) => {
      IPL_TEAMS.forEach((t) => {
        if (m.teamA.includes(t.short) || m.teamA.includes(t.name)) {
          table[t.id].played += 1;
          if (m.winnerText.includes(t.short) || m.winnerText.includes(t.name)) {
            table[t.id].won += 1;
            table[t.id].points += 2;
          } else {
            table[t.id].lost += 1;
          }
        }
        if (m.teamB.includes(t.short) || m.teamB.includes(t.name)) {
          table[t.id].played += 1;
          if (m.winnerText.includes(t.short) || m.winnerText.includes(t.name)) {
            table[t.id].won += 1;
            table[t.id].points += 2;
          } else {
            table[t.id].lost += 1;
          }
        }
      });
    });

    return Object.values(table).sort((a, b) => b.points - a.points || b.won - a.won);
  }, [matchHistory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">IPL Championship Points Table</h1>
          <p className="text-xs text-slate-400">Live franchise standings updated automatically after every match.</p>
        </div>
        <button
          onClick={() => navigate('cricket-game')}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
        >
          Play League Fixture →
        </button>
      </div>

      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400 uppercase">
            <tr>
              <th className="py-3.5 px-4">Pos</th>
              <th className="py-3.5 px-4">Franchise</th>
              <th className="py-3.5 px-4 text-center">P</th>
              <th className="py-3.5 px-4 text-center">W</th>
              <th className="py-3.5 px-4 text-center">L</th>
              <th className="py-3.5 px-4 text-right">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {standings.map((row, idx) => (
              <tr key={row.team.id} className="hover:bg-slate-900/50">
                <td className="py-3 px-4 font-bold text-slate-400">#{idx + 1}</td>
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <span>{row.team.badge}</span>
                  <span>{row.team.name}</span>
                </td>
                <td className="py-3 px-4 text-center text-slate-300">{row.played}</td>
                <td className="py-3 px-4 text-center text-emerald-400 font-bold">{row.won}</td>
                <td className="py-3 px-4 text-center text-rose-400">{row.lost}</td>
                <td className="py-3 px-4 text-right font-black text-amber-400">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// 13. MATCH HISTORY & ORANGE / PURPLE CAP LEADERS
// ============================================================================
function MatchHistoryView({ matchHistory }) {
  const { orangeCap, purpleCap } = useMemo(() => {
    const batters = {};
    const bowlers = {};
    matchHistory.forEach((m) => {
      Object.values(m.batterStats || {}).forEach((b) => {
        if (!batters[b.name]) batters[b.name] = { name: b.name, runs: 0, sixes: 0 };
        batters[b.name].runs += b.runs;
        batters[b.name].sixes += b.sixes;
      });
      Object.values(m.bowlerStats || {}).forEach((bw) => {
        if (!bowlers[bw.name]) bowlers[bw.name] = { name: bw.name, wickets: 0, runs: 0 };
        bowlers[bw.name].wickets += bw.wickets;
        bowlers[bw.name].runs += bw.runs;
      });
    });

    const topBat = Object.values(batters).sort((a, b) => b.runs - a.runs)[0] || null;
    const topBowl = Object.values(bowlers).sort((a, b) => b.wickets - a.wickets)[0] || null;
    return { orangeCap: topBat, purpleCap: topBowl };
  }, [matchHistory]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-white">Tournament Caps & Match History</h1>

      {/* Orange Cap & Purple Cap Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-orange-950/70 to-slate-900 border border-orange-500/40 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-orange-400">🧢 Orange Cap Leader</span>
            <h3 className="text-xl font-black text-white mt-1">{orangeCap ? orangeCap.name : 'Play a match to unlock'}</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {orangeCap ? `${orangeCap.runs} Runs • ${orangeCap.sixes} Sixes` : 'No innings recorded yet'}
            </p>
          </div>
          <span className="text-4xl">🏏</span>
        </div>

        <div className="bg-gradient-to-br from-purple-950/70 to-slate-900 border border-purple-500/40 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-purple-400">🧢 Purple Cap Leader</span>
            <h3 className="text-xl font-black text-white mt-1">{purpleCap ? purpleCap.name : 'Play a match to unlock'}</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {purpleCap ? `${purpleCap.wickets} Wickets` : 'No spells recorded yet'}
            </p>
          </div>
          <span className="text-4xl">⚾</span>
        </div>
      </div>

      {/* Match Results List */}
      <div className="space-y-3">
        {matchHistory.length === 0 ? (
          <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
            No completed matches yet. Finish a match in Cricket Game to log full scorecards here!
          </div>
        ) : (
          matchHistory.map((m) => (
            <div key={m.id} className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-400">{m.date} • {m.mode.toUpperCase()}</div>
                <div className="font-bold text-white text-sm mt-0.5">
                  {m.teamA} ({m.scoreA}) vs {m.teamB} ({m.scoreB})
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 text-xs font-bold">
                🏆 {m.winnerText}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 14. PROFILE & MULTI-ACCOUNT MANAGER VIEW
// ============================================================================
function ProfileView({ users, currentUser, onSwitch, onRegister }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('🏏');

  return (
    <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-lg font-black text-white">Active Same-Browser Accounts</h2>
        <p className="text-xs text-slate-400">
          Switch between demo accounts to test joining rooms, bidding against yourself, and playing head-to-head
          matches.
        </p>
        <div className="space-y-2">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => onSwitch(u)}
              className={`w-full p-3 rounded-xl border flex items-center justify-between text-left ${
                currentUser?.id === u.id
                  ? 'bg-emerald-500/20 border-emerald-400 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{u.avatar}</span>
                <div>
                  <div className="text-xs font-bold">{u.username}</div>
                  <div className="text-[10px] text-slate-400">{u.email}</div>
                </div>
              </div>
              {currentUser?.id === u.id && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                  Active
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 space-y-4">
        <h2 className="text-lg font-black text-white">Create New Owner Profile</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRegister(username, email, avatar);
            setUsername('');
            setEmail('');
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-xs text-slate-400 mb-1">Owner Name</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Dhoni Fan #1"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@cricketverse.gg"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Avatar Emblem</label>
            <div className="flex gap-2">
              {['🏏', '👑', '🦁', '⚡', '🔥', '🏆', '🎯'].map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setAvatar(em)}
                  className={`w-10 h-10 rounded-xl text-lg border ${
                    avatar === em ? 'bg-emerald-500/20 border-emerald-400' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm"
          >
            Create & Switch Profile
          </button>
        </form>
      </div>
    </div>
  );
}