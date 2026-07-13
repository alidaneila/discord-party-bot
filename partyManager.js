import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ROLES, MAX_PARTY_SIZE } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, 'data', 'parties.json');

function load() {
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function save(parties) {
  writeFileSync(DATA_PATH, JSON.stringify(parties, null, 2));
}

// members structure: { roleId: [ { userId, username }, ... ] }
export function getPartyByMessage(messageId) {
  return load().find(p => p.messageId === messageId) ?? null;
}

export function createParty({ messageId, channelId, hostId, hostName, title }) {
  const parties = load();
  const members = {};
  ROLES.forEach(r => { members[r.id] = []; });

  const party = {
    messageId,
    channelId,
    hostId,
    hostName,
    title,
    status: 'open',
    createdAt: Date.now(),
    members,
  };
  parties.push(party);
  save(parties);
  return party;
}

export function totalMembers(party) {
  return Object.values(party.members).reduce((sum, arr) => sum + arr.length, 0);
}

export function joinRole(messageId, roleId, userId, username) {
  const parties = load();
  const idx = parties.findIndex(p => p.messageId === messageId);
  if (idx === -1) return { ok: false, reason: 'Party tidak ditemukan.' };

  const party = parties[idx];
  if (party.status !== 'open') return { ok: false, reason: 'Party sudah ditutup.' };

  // ngecek kl user udh punya role di party ini
  const existingRole = Object.entries(party.members).find(([, arr]) =>
    arr.some(m => m.userId === userId),
  );
  if (existingRole) {
    return { ok: false, reason: `Kamu sudah ambil role **${existingRole[0]}**. Cancel dulu.` };
  }

  // cek party penuh
  if (totalMembers(party) >= MAX_PARTY_SIZE) {
    return { ok: false, reason: 'Party sudah penuh (8/8).' };
  }

  // Cek slot role
  const roleCfg = ROLES.find(r => r.id === roleId);
  if (!roleCfg) return { ok: false, reason: 'Role tidak valid.' };
  if (party.members[roleId].length >= roleCfg.maxSlot) {
    return { ok: false, reason: `Slot **${roleCfg.label}** sudah penuh (${roleCfg.maxSlot}/${roleCfg.maxSlot}).` };
  }

  party.members[roleId].push({ userId, username });
  parties[idx] = party;
  save(parties);
  return { ok: true, party };
}

export function leaveRole(messageId, userId) {
  const parties = load();
  const idx = parties.findIndex(p => p.messageId === messageId);
  if (idx === -1) return { ok: false, reason: 'Party tidak ditemukan.' };

  const party = parties[idx];
  let roleLeft = null;

  for (const [roleId, arr] of Object.entries(party.members)) {
    const memberIdx = arr.findIndex(m => m.userId === userId);
    if (memberIdx !== -1) {
      arr.splice(memberIdx, 1);
      roleLeft = roleId;
      break;
    }
  }

  if (!roleLeft) return { ok: false, reason: 'Kamu belum join party ini.' };

  parties[idx] = party;
  save(parties);
  return { ok: true, party, roleLeft };
}

// remove member by host
export function removeMember(messageId, hostId, targetUserId) {
  const parties = load();
  const idx = parties.findIndex(p => p.messageId === messageId);
  if (idx === -1) return { ok: false, reason: 'Party tidak ditemukan.' };

  const party = parties[idx];
  if (party.hostId !== hostId) return { ok: false, reason: 'Hanya host yang bisa remove member.' };

  let roleLeft = null;
  for (const [roleId, arr] of Object.entries(party.members)) {
    const memberIdx = arr.findIndex(m => m.userId === targetUserId);
    if (memberIdx !== -1) {
      arr.splice(memberIdx, 1);
      roleLeft = roleId;
      break;
    }
  }

  if (!roleLeft) return { ok: false, reason: 'User tidak ada di party ini.' };

  parties[idx] = party;
  save(parties);
  return { ok: true, party, roleLeft };
}

export function updateTitle(messageId, newTitle) {
  const parties = load();
  const idx = parties.findIndex(p => p.messageId === messageId);
  if (idx === -1) return null;
  parties[idx].title = newTitle;
  save(parties);
  return parties[idx];
}

// status: 'open' | 'locked' | 'done' | 'cancelled'
export function setStatus(messageId, status) {
  const parties = load();
  const idx = parties.findIndex(p => p.messageId === messageId);
  if (idx === -1) return null;
  parties[idx].status = status;
  save(parties);
  return parties[idx];
}
