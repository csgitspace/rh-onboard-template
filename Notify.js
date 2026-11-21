/**********************************************************************
 * StaffFlow — Notify.gs
 *
 * Four kinds of mail, and no others:
 *   1. Intake   — once, when a request is filed. Goes to every lane.
 *   2. Digest   — end of day, ONLY if something moved. Goes to every lane.
 *   3. Welcome  — once, to the employee's personal address.
 *   4. Reminder — every 48 hours (weekday mornings), one per lane, ONLY while that lane
 *                 still has open steps. Goes to that lane alone.
 * Anyone can also push the digest early from the status page.
 *
 * Table layouts, fully inline styles, no <style> blocks — Gmail and
 * Outlook both render these correctly.
 **********************************************************************/

const PURPLE = '#63419A';
const DARK   = '#4A2F78';
const TINT   = '#F3F0F8';
const GREY   = '#636263';
const OKGRN  = '#2e7d54';

function h_(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEmail_(heading, subheading, bodyHtml, ctaLabel, ctaUrl, footerText) {
  const logo = prop_('LOGO_URL');
  const district = prop_('DISTRICT_NAME', 'Royalton-Hartland CSD');
  heading = h_(heading);
  subheading = h_(subheading);

  const cta = (ctaLabel && ctaUrl)
    ? '<tr><td style="padding:4px 28px 28px 28px;">' +
      '<a href="' + ctaUrl + '" style="display:inline-block;background-color:' + PURPLE + ';color:#ffffff;' +
      'font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;' +
      'padding:11px 22px;border-radius:22px;">' + ctaLabel + '</a></td></tr>'
    : '';

  return '' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f7;padding:24px 0;">' +
    '<tr><td align="center">' +
      '<table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="width:620px;max-width:620px;background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e1ef;">' +
        '<tr><td style="background-color:' + PURPLE + ';padding:20px 28px;">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
            (logo ? '<td width="44" style="width:44px;"><img src="' + logo + '" width="36" height="36" alt="" style="display:block;border:0;"></td>' : '') +
            '<td style="font-family:Helvetica,Arial,sans-serif;color:#ffffff;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold;">Staff workflow</td>' +
          '</tr></table>' +
        '</td></tr>' +
        '<tr><td style="padding:26px 28px 6px 28px;">' +
          '<div style="font-family:Helvetica,Arial,sans-serif;font-size:20px;line-height:26px;color:#1f1b26;font-weight:bold;">' + heading + '</div>' +
          (subheading ? '<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:20px;color:' + GREY + ';padding-top:6px;">' + subheading + '</div>' : '') +
        '</td></tr>' +
        '<tr><td style="padding:14px 28px 8px 28px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:21px;color:#2c2833;">' +
          bodyHtml +
        '</td></tr>' +
        cta +
        '<tr><td style="background-color:' + TINT + ';padding:16px 28px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:17px;color:' + GREY + ';">' +
          h_(district) + ' — ' + h_(footerText || 'one message a day per person, sent only when something changed. No reply needed.') +
        '</td></tr>' +
      '</table>' +
    '</td></tr>' +
  '</table>';
}

function factTable_(pairs) {
  const rows = pairs.filter(function (p) { return p[1] !== '' && p[1] !== null && p[1] !== undefined; })
    .map(function (p) {
      return '<tr>' +
        '<td style="padding:6px 14px 6px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:' + GREY + ';white-space:nowrap;vertical-align:top;">' + h_(p[0]) + '</td>' +
        '<td style="padding:6px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#2c2833;font-weight:bold;vertical-align:top;">' + h_(p[1]) + '</td>' +
      '</tr>';
    }).join('');
  if (!rows) return '';
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:' + TINT + ';border-radius:10px;margin:6px 0 16px 0;">' +
    '<tr><td style="padding:12px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">' + rows + '</table></td></tr></table>';
}

function sectionLabel_(text) {
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.4px;' +
    'text-transform:uppercase;font-weight:bold;color:' + GREY + ';margin:18px 0 8px 0;">' + h_(text) + '</div>';
}

function knownValues_(rec) {
  return factTable_([
    ['Employee ID',     rec.employeeId],
    ['State ID',        rec.stateId],
    ['District email',  rec.districtEmail],
    ['Extension',       rec.phoneExtension],
    ['Room',            rec.roomNumber],
    ['Device',          rec.deviceAssetTag]
  ]);
}

function personLine_(rec) {
  const bits = [rec.positionTitle, rec.buildings].filter(Boolean).join(' · ');
  const when = rec.effectiveDate ? 'starts ' + fmtDate_(rec.effectiveDate) : 'date TBD';
  return (bits ? bits + ' · ' : '') + when;
}

/** Every lane, how far along it is, and what it still owes. */
function laneTable_(tasks) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">' +
    laneSummary_(tasks).map(function (l) {
      const badge = l.complete
        ? '<span style="font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:bold;color:' + OKGRN + ';">COMPLETE</span>'
        : '<span style="font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:bold;color:' + DARK + ';">' + l.done + ' of ' + l.total + '</span>';
      return '<tr><td style="padding:9px 0;border-bottom:1px solid #ece8f3;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td style="font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:bold;color:#1f1b26;">' + h_(l.label) + '</td>' +
          '<td align="right">' + badge + '</td>' +
        '</tr></table>' +
        (l.open.length
          ? '<div style="font-family:Helvetica,Arial,sans-serif;font-size:12.5px;line-height:18px;color:' + GREY + ';padding-top:4px;">Still open: ' +
            l.open.map(function (o) {
              return h_(o.label) + (o.assignedName ? ' <span style="color:' + DARK + ';">(' + h_(o.assignedName) + ')</span>' : '');
            }).join('; ') + '</div>'
          : '') +
      '</td></tr>';
    }).join('') + '</table>';
}

function movedTable_(moved) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">' +
    moved.map(function (t) {
      const who = t.completedBy ? personName_(t.completedBy) : '';
      return '<tr><td style="padding:8px 0;border-bottom:1px solid #ece8f3;">' +
        '<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#1f1b26;font-weight:bold;">' +
          h_(t.label) + (t.status === 'N/A' ? ' <span style="font-weight:normal;color:' + GREY + ';">(not applicable)</span>' : '') + '</div>' +
        '<div style="font-family:Helvetica,Arial,sans-serif;font-size:12.5px;color:' + GREY + ';padding-top:3px;">' +
          h_(who) + (t.outputValue ? ' · ' + h_(t.outputField) + ': <b style="color:' + DARK + ';">' + h_(t.outputValue) + '</b>' : '') +
          (t.notes ? ' · ' + h_(t.notes) : '') +
        '</div></td></tr>';
    }).join('') + '</table>';
}

function boardUrl_(recordId) {
  const base = prop_('WEBAPP_URL');
  if (!base) return '';
  return recordId ? base + '?record=' + encodeURIComponent(recordId) : base;
}

/* ------------------------------------------------------------------ */
/* 1. Intake                                                           */
/* ------------------------------------------------------------------ */

function sendIntakeEmail_(recordId) {
  const rec = findRecord_(recordId);
  const to = recipientsFor_(recordId);
  if (!rec || !to.length) return;
  const tasks = readSheet_(SHEETS.TASKS).filter(function (t) { return t.recordId === recordId; });

  const body =
    '<p style="margin:0 0 4px 0;">' + h_(String(rec.createdBy).split('@')[0]) +
    ' opened this ' + h_(String(rec.requestType).toLowerCase()) +
    '. Every office can start now — nothing is waiting on anyone else.</p>' +
    factTable_([
      ['Position',       rec.positionTitle],
      ['Building',       rec.buildings],
      ['State ID',       rec.stateId],
      ['Effective',      fmtDate_(rec.effectiveDate)],
      ['Employment type', rec.employmentType],
      ['Probation ends', fmtDate_(rec.probationEndDate)],
      ['Supervisor',     rec.supervisorEmail],
      ['Replacing',      rec.replacingWhom],
      ['Worked here before', rec.priorEmployee]
    ]) +
    (rec.changeSummary ? '<p style="margin:0 0 14px 0;"><b>What is changing:</b> ' + h_(rec.changeSummary) + '</p>' : '') +
    sectionLabel_('Who owes what') +
    laneTable_(tasks) +
    (rec.notes ? '<p style="margin:16px 0 0 0;font-size:13px;color:' + GREY + ';"><b>Note from intake:</b> ' + h_(rec.notes) + '</p>' : '') +
    '<p style="margin:16px 0 0 0;font-size:13px;color:' + GREY + ';">From here you will get one summary at the end of any day something changes. ' +
    'The status page is always current if you need it sooner.</p>';

  sendMail_(to.join(','),
    '[' + rec.recordId + '] New: ' + displayName_(rec),
    buildEmail_(displayName_(rec), personLine_(rec), body, 'Open the status page', boardUrl_(recordId)));

  log_(recordId, 'INTAKE_EMAIL', to.length + ' recipients');
}

/* ------------------------------------------------------------------ */
/* 2. End-of-day digest                                                */
/* ------------------------------------------------------------------ */

/** Returns the email body, or null when nothing moved. */
function digestFor_(rec, tasks, since, manual) {
  const cutoff = since ? new Date(since).getTime() : 0;
  const moved = tasks.filter(function (t) {
    return t.completedAt && new Date(t.completedAt).getTime() > cutoff;
  }).sort(function (a, b) { return new Date(a.completedAt) - new Date(b.completedAt); });
  if (!moved.length) return null;

  const openCount = tasks.filter(function (t) {
    return t.status !== 'Done' && t.status !== 'N/A';
  }).length;

  const lead = manual
    ? h_(String(currentUser_()).split('@')[0]) + ' sent this update early.'
    : (moved.length === 1 ? 'One step closed today.' : moved.length + ' steps closed today.');

  const body =
    '<p style="margin:0 0 4px 0;">' + lead + ' ' +
    (openCount ? openCount + (openCount === 1 ? ' step is' : ' steps are') + ' still open.'
               : 'Everything on this checklist is now closed.') + '</p>' +
    knownValues_(rec) +
    sectionLabel_(manual ? 'Recently closed' : 'Closed today') +
    movedTable_(moved) +
    sectionLabel_('Where every office stands') +
    laneTable_(tasks);

  return {
    body: body,
    count: moved.length,
    subject: '[' + rec.recordId + '] ' + displayName_(rec) + ' — ' + moved.length +
             (moved.length === 1 ? ' update' : ' updates')
  };
}

/** Runs on the daily trigger. One email per person, only when something moved. */
function dailyDigest() {
  const allTasks = readSheet_(SHEETS.TASKS);
  const now = new Date();
  let sent = 0;

  readSheet_(SHEETS.RECORDS).forEach(function (rec) {
    if (rec.status === 'Cancelled') return;
    const tasks = allTasks.filter(function (t) { return t.recordId === rec.recordId; });
    const d = digestFor_(rec, tasks, rec.lastDigestAt, false);
    if (!d) return;

    const to = recipientsFor_(rec.recordId);
    if (to.length) {
      sendMail_(to.join(','), d.subject,
        buildEmail_(displayName_(rec), personLine_(rec), d.body,
          'Open the status page', boardUrl_(rec.recordId)));
      sent++;
    }
    writeCell_(SHEETS.RECORDS, rec._row, 'lastDigestAt', now);
    log_(rec.recordId, 'DIGEST_SENT', d.count + ' updates');
  });

  return sent;
}

/** The "send an update now" button on the status page. */
function sendUpdateNow(recordId) {
  const rec = findRecord_(recordId);
  if (!rec) throw new Error('Record not found.');
  const tasks = readSheet_(SHEETS.TASKS).filter(function (t) { return t.recordId === recordId; });
  const d = digestFor_(rec, tasks, rec.lastDigestAt, true);
  if (!d) throw new Error('Nothing has changed since the last update went out, so there is nothing to send.');

  const to = recipientsFor_(recordId);
  if (!to.length) throw new Error('No addresses are configured on the Roles tab for this record.');

  sendMail_(to.join(','), d.subject,
    buildEmail_(displayName_(rec), personLine_(rec), d.body,
      'Open the status page', boardUrl_(recordId)));
  writeCell_(SHEETS.RECORDS, rec._row, 'lastDigestAt', new Date());
  log_(recordId, 'DIGEST_MANUAL', d.count + ' updates to ' + to.length + ' recipients');
  return { ok: true, count: d.count, recipients: to.length };
}

/* ------------------------------------------------------------------ */
/* 3. Welcome email                                                    */
/* ------------------------------------------------------------------ */

/**
 * Goes to the employee's personal address and closes the task.
 * The password composes the message and is never written anywhere.
 */
function sendWelcomeEmail(taskId, tempPassword, variant, bcc) {
  const ctx = welcomeContext_(taskId, tempPassword);
  const allowed = welcomeBccOptions_(ctx.rec).map(function (o) { return o.email.toLowerCase(); });
  const chosen = [].concat(bcc || []).map(function (e) { return String(e).trim(); })
    .filter(function (e, i, a) {
      return e && allowed.indexOf(e.toLowerCase()) > -1 && a.indexOf(e) === i;
    });
  const html = welcomeHtml_(ctx.rec, tempPassword, variant);
  sendMail_(ctx.rec.personalEmail, WELCOME_SUBJECT, html, chosen);
  log_(ctx.rec.recordId, 'WELCOME_SENT', 'to ' + ctx.rec.personalEmail + ' · ' + variant +
    (chosen.length ? ' · bcc ' + chosen.join(', ') : ''));
  return completeTask(taskId, '', 'Welcome email sent to personal address');
}

/**
 * Both versions of the message exactly as they would go out, the version
 * this record most likely needs, and who can be blind-copied.
 */
function previewWelcomeEmail(taskId, tempPassword) {
  const ctx = welcomeContext_(taskId, tempPassword);
  return {
    to: ctx.rec.personalEmail,
    subject: WELCOME_SUBJECT,
    variant: defaultWelcomeVariant_(ctx.rec),
    html: {
      instructional: welcomeHtml_(ctx.rec, tempPassword, 'instructional'),
      support:       welcomeHtml_(ctx.rec, tempPassword, 'support')
    },
    bccOptions: welcomeBccOptions_(ctx.rec)
  };
}

const WELCOME_SUBJECT = 'Welcome to Roy-Hart: Technology Getting Started Guide for New Staff';

/* Who can be blind-copied. Ticked by default unless noted; a principal is
 * ticked only when the record is in that building. */
const WELCOME_BCC = [
  { email: 'superintendent@example.org',      label: 'Superintendent' },
  { email: 'director@example.org', label: 'Director of Instructional Programming' },
  { email: 'techintegrator@example.org',    label: 'Technology Integrator' }
];
const WELCOME_PRINCIPALS = {
  'Elementary':    'principal-elementary@example.org',
  'Middle School': 'principal-ms@example.org',
  'High School':   'principal-hs@example.org'
};

/* Positions that get the shorter guide without eSchoolData and student
 * data privacy. Central Services records get it too. */
const SUPPORT_PROFILES = ['TEACHING_ASSISTANT', 'CLERICAL', 'CUSTODIAL', 'FOOD_SERVICE', 'TRANSPORTATION'];

function defaultWelcomeVariant_(rec) {
  const profiles = String(rec.profileKeys || '').split(',');
  const support = profiles.some(function (p) { return SUPPORT_PROFILES.indexOf(p.trim()) > -1; });
  const centralOnly = buildingRolesFor_(rec.buildings).join() === 'BLDG_CS';
  return (support || centralOnly) ? 'support' : 'instructional';
}

function welcomeBccOptions_(rec) {
  const text = String(rec.buildings || '');
  const out = [{ email: String(rec.districtEmail).trim(), label: 'Their new district email', checked: true }];
  WELCOME_BCC.forEach(function (o) { out.push({ email: o.email, label: o.label, checked: true }); });
  BUILDINGS.forEach(function (b) {
    const p = WELCOME_PRINCIPALS[b.label];
    if (p) out.push({ email: p, label: b.label + ' principal', checked: b.match.test(text) });
  });
  const seen = {};
  const to = String(rec.personalEmail).toLowerCase().trim();
  return out.filter(function (o) {
    const k = o.email.toLowerCase();
    if (!k || k === to || seen[k]) return false;
    seen[k] = true;
    return true;
  });
}

function welcomeContext_(taskId, tempPassword) {
  const task = findTask_(taskId);
  if (!task) throw new Error('Task not found.');
  const rec = findRecord_(task.recordId);
  if (!rec) throw new Error('Record not found.');
  if (!rec.personalEmail) throw new Error('No personal email on file for this record.');
  if (!rec.districtEmail) throw new Error('The district account has not been created yet.');
  if (!tempPassword) throw new Error('Enter the temporary password to send the welcome message.');
  return { task: task, rec: rec };
}

/**
 * The tech office's own guide lives in WelcomeEmail.html; only the account
 * card is filled in per person. Empty values are left out. The support
 * version drops the eSchoolData and student data privacy sections.
 */
function welcomeHtml_(rec, tempPassword, variant) {
  const t = HtmlService.createTemplateFromFile('WelcomeEmail');
  t.instructional = variant !== 'support';
  t.firstName = rec.preferredName || rec.legalFirst;
  t.accountRows = welcomeRows_([
    ['Username',           String(rec.districtEmail).split('@')[0]],
    ['District email',     rec.districtEmail],
    ['Temporary password', tempPassword],
    ['Employee ID',        rec.employeeId],
    ['Building',           rec.buildings],
    ['Room',               rec.roomNumber],
    ['Extension',          rec.phoneExtension],
    ['Start date',         fmtDate_(rec.effectiveDate)]
  ]);
  return t.evaluate().getContent();
}

function welcomeRows_(pairs) {
  return pairs.filter(function (p) { return p[1] !== '' && p[1] !== null && p[1] !== undefined; })
    .map(function (p) {
      return '<tr>' +
        '<td style="padding:5px 18px 5px 0;font-size:14px;color:#6B6478;white-space:nowrap;vertical-align:top;">' + h_(p[0]) + '</td>' +
        '<td style="padding:5px 0;font-size:15px;color:#241C33;font-weight:700;vertical-align:top;">' + h_(p[1]) + '</td>' +
      '</tr>';
    }).join('');
}

/* ------------------------------------------------------------------ */
/* 4. Per-lane reminder                                                */
/* ------------------------------------------------------------------ */

function isOpen_(t) {
  return t.status !== 'Done' && t.status !== 'N/A';
}

/** One record's open steps for one lane. */
function reminderBlock_(rec, laneTasks, allRecordTasks) {
  const byKey = {};
  allRecordTasks.forEach(function (t) { byKey[t.taskKey] = t; });

  const rows = laneTasks.map(function (t) {
    let detail = t.assignedTo ? 'Assigned to ' + personName_(t.assignedTo) : 'Anyone in this office';
    if (t.status === 'Waiting') {
      const blockers = String(t.dependsOn || '').split(',')
        .map(function (s) { return byKey[s.trim()]; })
        .filter(function (d) { return d && isOpen_(d); })
        .map(function (d) { return d.label; });
      if (blockers.length) detail += ' · after ' + blockers.join(', ');
    }
    if (t.notes) detail += ' · ' + t.notes;
    return '<tr><td style="padding:7px 0;border-bottom:1px solid #ece8f3;">' +
      '<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#1f1b26;font-weight:bold;">' +
        h_(t.label) + (t.status === 'Waiting' ? ' <span style="font-weight:normal;color:' + GREY + ';">(waiting)</span>' : '') + '</div>' +
      '<div style="font-family:Helvetica,Arial,sans-serif;font-size:12.5px;color:' + GREY + ';padding-top:3px;">' + h_(detail) + '</div>' +
    '</td></tr>';
  }).join('');

  const link = boardUrl_(rec.recordId);
  const name = h_(displayName_(rec));
  return '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;color:' + DARK + ';margin:20px 0 2px 0;">' +
      (link ? '<a href="' + link + '" style="color:' + DARK + ';text-decoration:none;">' + name + '</a>' : name) +
    '</div>' +
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:12.5px;color:' + GREY + ';">' +
      h_('[' + rec.recordId + '] ' + personLine_(rec)) + '</div>' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">' + rows + '</table>';
}

/**
 * Runs on the morning trigger. Each lane with at least one open step on
 * an active record gets one email listing all of them. A lane with
 * nothing open gets nothing. Skips Saturday and Sunday.
 *
 * The trigger fires daily, but only sends once REMINDER_EVERY_HOURS
 * (default 48) have passed since the last send. Trigger times wander
 * within the hour, so the gate allows a few hours of slack. Running it
 * from the menu (no trigger event) always sends.
 */
function dailyReminders(e) {
  const dow = Number(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'u'));
  if (dow >= 6) return 0;

  const props = PropertiesService.getScriptProperties();
  if (e && e.triggerUid) {
    const everyMs = Number(prop_('REMINDER_EVERY_HOURS', '48')) * 3600 * 1000;
    const last = Number(props.getProperty('LAST_REMINDER_AT') || 0);
    if (Date.now() - last < everyMs - 6 * 3600 * 1000) return 0;
  }

  const roles = getRoles_();
  const allTasks = readSheet_(SHEETS.TASKS);
  const records = readSheet_(SHEETS.RECORDS).filter(function (r) {
    return r.status !== 'Cancelled' && r.status !== 'Complete';
  }).sort(function (a, b) {
    const da = a.effectiveDate ? new Date(a.effectiveDate).getTime() : Infinity;
    const db = b.effectiveDate ? new Date(b.effectiveDate).getTime() : Infinity;
    return da - db;
  });
  let sent = 0;

  roleOrder_().forEach(function (roleKey) {
    let stepCount = 0;
    const blocks = [];
    records.forEach(function (rec) {
      const recTasks = allTasks.filter(function (t) { return t.recordId === rec.recordId; });
      const open = recTasks.filter(function (t) { return t.ownerRole === roleKey && isOpen_(t); });
      if (!open.length) return;
      stepCount += open.length;
      blocks.push(reminderBlock_(rec, open, recTasks));
    });
    if (!blocks.length) return;

    const to = emailsForRole_(roleKey);
    if (!to.length) return;

    const label = roles[roleKey] ? roles[roleKey].roleLabel : roleKey;
    const peopleCount = blocks.length;
    const summary = stepCount + (stepCount === 1 ? ' open step' : ' open steps') + ' across ' +
      peopleCount + (peopleCount === 1 ? ' person' : ' people');
    const body =
      '<p style="margin:0 0 4px 0;">Here is everything ' + h_(label) + ' still has open. ' +
      'Once these are closed on the status page, this reminder stops.</p>' +
      blocks.join('');

    sendMail_(to.join(','),
      label + ' — ' + summary,
      buildEmail_(label + ': still to do', summary, body,
        'Open the status page', boardUrl_(''),
        'a reminder every other weekday morning while your office has open steps. No reply needed.'));
    log_('', 'REMINDER_SENT', label + ': ' + summary + ' to ' + to.length + ' recipients');
    sent++;
  });

  if (sent) props.setProperty('LAST_REMINDER_AT', String(Date.now()));

  return sent;
}

function sendMail_(to, subject, htmlBody, bcc) {
  const opts = {
    to: to, subject: subject, htmlBody: htmlBody,
    name: prop_('FROM_NAME', 'Roy-Hart Staff Workflow')
  };
  if (bcc && bcc.length) opts.bcc = bcc.join(',');
  MailApp.sendEmail(opts);
}