/**
 * Seed Module — MeetSync Mock Data
 *
 * Populates localStorage with 3 demo users, ~10 meetings, and cross-user
 * invitations so the app is ready to demo immediately after a fresh load.
 *
 * Guard: runs only once per browser (keyed by SEED_KEY). Clear localStorage
 * to re-seed.
 */

import { insertRecord, getRecords } from './db-api.js';

const DB_USERS       = 'db_users';
const DB_MEETINGS    = 'db_meetings';
const DB_INVITATIONS = 'db_invitations';
const SEED_KEY       = 'meetsync_seed_v1';

//  Date helpers 

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

//  Main seed function 

export function initSeed() {
  if (localStorage.getItem(SEED_KEY)) return; // already seeded

  //  1. Create mock users 

  const alex = insertRecord(DB_USERS, {
    username:  'alex@meetsync.dev',
    password:  'alex123',
    fullName:  'Alex Johnson',
    createdAt: new Date().toISOString(),
  });

  const maya = insertRecord(DB_USERS, {
    username:  'maya@meetsync.dev',
    password:  'maya123',
    fullName:  'Maya Chen',
    createdAt: new Date().toISOString(),
  });

  const jordan = insertRecord(DB_USERS, {
    username:  'jordan@meetsync.dev',
    password:  'jordan123',
    fullName:  'Jordan Smith',
    createdAt: new Date().toISOString(),
  });

  //  2. Create meetings 

  // Alex's meetings
  const m1 = insertRecord(DB_MEETINGS, {
    userId:       alex.id,
    title:        'Product Kickoff',
    date:         daysFromNow(7),
    time:         '10:00',
    location:     'Main Conference Room',
    description:  'Kick off the new product cycle with the whole team.',
    participants: [maya.id],
    createdAt:    new Date().toISOString(),
  });

  const m2 = insertRecord(DB_MEETINGS, {
    userId:       alex.id,
    title:        'Team Standup',
    date:         daysFromNow(0),
    time:         '09:00',
    location:     'Zoom – Daily Standup Link',
    description:  'Quick 15-minute daily sync.',
    participants: [jordan.id],
    createdAt:    new Date().toISOString(),
  });

  insertRecord(DB_MEETINGS, {
    userId:       alex.id,
    title:        'Q1 Planning Review',
    date:         daysFromNow(-3),
    time:         '14:00',
    location:     'Board Room B',
    description:  'Reviewed Q1 OKRs and targets.',
    participants: [],
    createdAt:    new Date().toISOString(),
  });

  // Maya's meetings
  const m4 = insertRecord(DB_MEETINGS, {
    userId:       maya.id,
    title:        'Design Sprint',
    date:         daysFromNow(3),
    time:         '11:00',
    location:     'Design Lab',
    description:  'Three-day design sprint for the new dashboard.',
    participants: [alex.id],
    createdAt:    new Date().toISOString(),
  });

  insertRecord(DB_MEETINGS, {
    userId:       maya.id,
    title:        'Client Presentation',
    date:         daysFromNow(14),
    time:         '15:30',
    location:     'Client HQ – Floor 12',
    description:  'Final presentation to the client stakeholders.',
    participants: [],
    createdAt:    new Date().toISOString(),
  });

  insertRecord(DB_MEETINGS, {
    userId:       maya.id,
    title:        'UX Workshop',
    date:         daysFromNow(-1),
    time:         '13:00',
    location:     'Innovation Hub',
    description:  'Hands-on UX workshop with the product team.',
    participants: [],
    createdAt:    new Date().toISOString(),
  });

  // Jordan's meetings
  const m7 = insertRecord(DB_MEETINGS, {
    userId:       jordan.id,
    title:        'Dev Sprint Planning',
    date:         daysFromNow(1),
    time:         '10:30',
    location:     'Engineering Room',
    description:  'Plan sprint tasks and assign story points.',
    participants: [alex.id, maya.id],
    createdAt:    new Date().toISOString(),
  });

  const m8 = insertRecord(DB_MEETINGS, {
    userId:       jordan.id,
    title:        'Code Review Session',
    date:         daysFromNow(0),
    time:         '16:00',
    location:     'Slack Huddle – #eng-review',
    description:  'Peer code review for the auth module.',
    participants: [maya.id],
    createdAt:    new Date().toISOString(),
  });

  insertRecord(DB_MEETINGS, {
    userId:       jordan.id,
    title:        'Tech Debt Discussion',
    date:         daysFromNow(-5),
    time:         '11:00',
    location:     'Engineering Room',
    description:  'Identified top 5 tech debt items to tackle next quarter.',
    participants: [],
    createdAt:    new Date().toISOString(),
  });

  insertRecord(DB_MEETINGS, {
    userId:       jordan.id,
    title:        'Architecture Review',
    date:         daysFromNow(10),
    time:         '14:00',
    location:     'Zoom – Architecture Sync',
    description:  'Review the new microservices proposal.',
    participants: [alex.id],
    createdAt:    new Date().toISOString(),
  });

  // ── 3. Seed invitations (using the meeting IDs from above) ────────────────

  // Maya invited to "Product Kickoff" → pending
  insertRecord(DB_INVITATIONS, {
    meetingId:  m1.id,
    fromUserId: alex.id,
    toUserId:   maya.id,
    status:     'pending',
    createdAt:  new Date().toISOString(),
  });

  // Jordan invited to "Team Standup" → accepted (meeting shows in Jordan's list)
  insertRecord(DB_INVITATIONS, {
    meetingId:  m2.id,
    fromUserId: alex.id,
    toUserId:   jordan.id,
    status:     'accepted',
    createdAt:  new Date().toISOString(),
  });

  // Alex invited to "Design Sprint" → pending
  insertRecord(DB_INVITATIONS, {
    meetingId:  m4.id,
    fromUserId: maya.id,
    toUserId:   alex.id,
    status:     'pending',
    createdAt:  new Date().toISOString(),
  });

  // Alex invited to "Dev Sprint Planning" → pending
  insertRecord(DB_INVITATIONS, {
    meetingId:  m7.id,
    fromUserId: jordan.id,
    toUserId:   alex.id,
    status:     'pending',
    createdAt:  new Date().toISOString(),
  });

  // Maya invited to "Dev Sprint Planning" → pending
  insertRecord(DB_INVITATIONS, {
    meetingId:  m7.id,
    fromUserId: jordan.id,
    toUserId:   maya.id,
    status:     'pending',
    createdAt:  new Date().toISOString(),
  });

  // Maya invited to "Code Review Session" → accepted
  insertRecord(DB_INVITATIONS, {
    meetingId:  m8.id,
    fromUserId: jordan.id,
    toUserId:   maya.id,
    status:     'accepted',
    createdAt:  new Date().toISOString(),
  });

  // Mark seed as done
  localStorage.setItem(SEED_KEY, '1');

  console.log('[MeetSync] Seed data loaded. Try logging in with:');
  console.log('  alex@meetsync.dev / alex123');
  console.log('  maya@meetsync.dev / maya123');
  console.log('  jordan@meetsync.dev / jordan123');
}
