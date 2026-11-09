// LAGDA eNotary — the Notary Directory, as published on lagda.io/enotary-directory/. Plain JavaScript, no build step.
// A directory, and honest about where eNotary stands: online notarial sessions are NOT open yet. Anyone can browse,
// search, filter and open a profile. Choosing a notary registers the visitor's interest (after signing in to LAGDA and,
// where LAGDA offers it, verifying their identity); nothing is booked and nothing is charged.
// Only lawyers and offices with their own published picture are listed (js/lawyers.js holds only those).
// What each profile shows is the lawyer's own published information: name, firm, position, office, practice areas,
// education, Bar admission, a link to their own page. No rating, review or fee is shown: none is known.
// A notary shows as online during their office hours (OFFICE_HOURS below) and can be sent a request only then.
(function () {
  "use strict";
  // Only entries with their own picture, whatever the data file holds.
  var LAWYERS = (window.LAWYERS || []).filter(function (l) { return typeof l.photo === "string" && l.photo && !/default_/.test(l.photo); });
  function byId(id) { return LAWYERS.filter(function (l) { return l.id === id; })[0] || null; }
  var SOON = "Online notarial sessions are not currently available: LAGDA eNotary is subject to Supreme Court accreditation. Choose a notary to register your interest, and we\u2019ll email you when you can book.";
  // When a notary can receive requests. One set of hours for every notary for now: hoursOf() below is where a notary's own
  // hours would come in. days: 0 is Sunday, 6 Saturday. open and close are "HH:MM" in timeZone; close is the first minute
  // that is no longer open. text says the same in words: change the two together.
  var OFFICE_HOURS = { days: [1, 2, 3, 4, 5], open: "08:00", close: "17:00", timeZone: "Asia/Manila", text: "Monday to Friday, 8:00 AM to 5:00 PM (Philippine time)" };
  var PAGE = 24;

  function hash(text) { var h = 5381; for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0; return h; }

  // ── helpers ─────────────────────────────────────────────────────────────
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function seed(id, salt) { return hash(id + "|" + salt); }
  function initials(l) { var p = l.name.replace(/,.*$/, "").split(/\s+/).filter(function (w) { return /^[A-Za-z]/.test(w) && !/^(and|of|&|law|office)$/i.test(w); }); return ((p[0] || "")[0] || "") + ((p.length > 1 ? p[p.length - 1] : "")[0] || ""); }
  function title(l) { return l.kind === "office" ? l.name : "Atty. " + l.name; }
  function starAt(x, y, r) { var pts = []; for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r; pts.push((x + Math.cos(a) * rr).toFixed(1) + "," + (y + Math.sin(a) * rr).toFixed(1)); } return '<polygon points="' + pts.join(" ") + '"/>'; }
  // The picture. A real photo when there is one; otherwise the default portrait (a lawyer, by the "gender" in the data) or initials (an office).
  // An office's own picture (a sign, a banner, a group picture) is flagged "wide" in the data and is always shown whole, never cropped.
  function defaultPhoto(l) { return l.kind === "office" ? "" : "assets/photos/default_" + (l.gender === "female" ? "female" : "male") + "_atty.png"; }
  function src(l) { return l.photo || defaultPhoto(l); }
  function whole(l) { return !!(l.wide && l.photo && l.photoW && l.photoH); }
  function pic(l, alt) { var s = src(l); return s ? '<img src="' + esc(s) + '" alt="' + esc(alt || "") + '"' + (l.photo ? "" : ' class="is-default"') + ">" : '<span class="initials" aria-hidden="true">' + esc(initials(l).toUpperCase()) + "</span>"; }
  /** Shown whole: the picture at its own shape, over a blurred, dimmed copy of itself. */
  function wholePic(l) { return '<img class="back" src="' + esc(l.photo) + '" alt="" aria-hidden="true"><img class="front" src="' + esc(l.photo) + '" alt="" width="' + l.photoW + '" height="' + l.photoH + '">'; }
  var ICON = {
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    firm: '<svg viewBox="0 0 24 24"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M9 10h.01M15 10h.01"/></svg>',
    brief: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
    seal: '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5.5"/><path d="m8.5 13.5-1.500 7 5-2.500 5 2.500-1.500-7"/></svg>',
  };
  function toast(text) { var t = document.getElementById("toast"); t.textContent = text; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2800); }

  function years(l) { return l.barYear ? 2026 - l.barYear : null; }

  // ── online or offline: whether a notary can receive a request now ───────
  // Worked out in the notary's time zone (OFFICE_HOURS.timeZone, Asia/Manila), never in the visitor's own zone:
  // the visitor's clock gives only the moment.
  var WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }, CLOCKS = {};
  function hoursOf(l) { return OFFICE_HOURS; } // the same hours for every notary for now; a notary's own hours (from l) would come in here
  /** The day (0 Sunday to 6 Saturday) and the time ("HH:MM", 24-hour) at this moment in a time zone. */
  function nowIn(zone) {
    var f = CLOCKS[zone] || (CLOCKS[zone] = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));
    var p = {}; f.formatToParts(Date.now()).forEach(function (x) { p[x.type] = x.value; });
    return { day: WEEKDAY[p.weekday], time: (p.hour === "24" ? "00" : p.hour) + ":" + p.minute };
  }
  /** Online: on one of the notary's days, from the opening time up to, not including, the closing time. */
  function online(l) {
    var h = hoursOf(l), now;
    try { now = nowIn(h.timeZone); } catch (err) { return false; } // the time there cannot be told: offline (the server decides in any case)
    return h.days.indexOf(now.day) >= 0 && now.time >= h.open && now.time < h.close;
  }
  /** Said wherever a request cannot be sent because the notary is offline: the fact, then when requests can be sent. */
  function offlineWords(l) { return ["This notary is offline.", "Requests can be sent " + hoursOf(l).text + "."]; }
  /** When an offline notary opens next, in their time zone: the day in words ("today", "tomorrow, Tuesday, November 10",
      "on Monday, November 9"), the opening time, and the minutes until then. */
  function nextOpening(l) {
    var h = hoursOf(l), now = nowIn(h.timeZone), ahead = 0;
    var minutes = function (t) { return +t.slice(0, 2) * 60 + +t.slice(3, 5); };
    if (!(h.days.indexOf(now.day) >= 0 && now.time < h.open)) { ahead = 1; while (ahead < 8 && h.days.indexOf((now.day + ahead) % 7) < 0) ahead++; }
    var date = new Intl.DateTimeFormat("en-US", { timeZone: h.timeZone, weekday: "long", month: "long", day: "numeric" }).format(Date.now() + ahead * 86400000);
    var hh = +h.open.slice(0, 2);
    return { day: ahead === 0 ? "today" : ahead === 1 ? "tomorrow, " + date : "on " + date, time: (hh % 12 || 12) + ":" + h.open.slice(3, 5) + (hh < 12 ? " AM" : " PM"), mins: ahead * 1440 + minutes(h.open) - minutes(now.time) };
  }
  /** "14 h 32 min", "2 days 15 h", "25 min". */
  function untilWords(m) { var d = Math.floor(m / 1440), hr = Math.floor(m % 1440 / 60), mn = m % 60; return d ? d + (d > 1 ? " days" : " day") + (hr ? " " + hr + " h" : "") : (hr ? hr + " h " : "") + mn + " min"; }
  var CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path class="hand-h" d="M12 12V7.5"/><path class="hand-m" d="M12 12h4.5"/></svg>';
  /** The profile's note above "Select this notary" while the notary is offline: why it cannot be pressed, and when to come back. */
  function waitNote(l) {
    var n = null; try { n = nextOpening(l); } catch (err) { /* the time there cannot be told: the hours alone */ }
    var back = n ? "Please come back <b>" + esc(n.day) + ', from <span class="nw">' + n.time + "</span></b> (Philippine time) to request it." : "Please come back during office hours to request it.";
    return '<div class="pf-wait-card"><span class="pf-wait-ic">' + CLOCK + '</span><div class="pf-wait-body">' +
      '<p class="pf-wait-title">Requests are closed for now</p>' +
      '<p class="pf-wait-text">' + esc(title(l)) + " is offline, so notarial service cannot be requested at this time. " + back + "</p>" +
      '<p class="pf-wait-meta">' + (n ? '<span class="pf-wait-count">Opens in ' + untilWords(n.mins) + "</span>" : "") + "<span>Office hours: " + keepTogether(hoursOf(l).text) + "</span></p></div>" +
      '<button type="button" class="pf-wait-x" data-wait-hide aria-label="Hide this message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>';
  }
  /** Escaped text that keeps each time ("8:00 AM") and "(Philippine time)" on one line. The words are unchanged. */
  function keepTogether(text) { return esc(text).replace(/\d{1,2}:\d{2} [AP]M|\(Philippine time\)/g, function (m) { return '<span class="nw">' + m + "</span>"; }); }
  // Who is in a session right now, from LAGDA (GET /api/public/enotary/availability): { directoryId: { until } }. Read when the
  // page opens and with every status refresh; while it cannot be read, nobody shows as in a session (the server decides in any case).
  var BUSY = {};
  function busy(l) { return Object.prototype.hasOwnProperty.call(BUSY, l.id); }
  function readAvailability() {
    return api("GET", "/public/enotary/availability").then(function (r) {
      if (!r.ok || !r.data || !Array.isArray(r.data.listings)) return;
      var next = {};
      r.data.listings.forEach(function (x) { if (x && typeof x.directoryId === "string") next[x.directoryId] = { until: x.until ? Date.parse(x.until) : null }; });
      BUSY = next;
    });
  }
  /** "10:30 AM", in the notary's time zone. */
  function clockAt(ms) { return new Intl.DateTimeFormat("en-US", { timeZone: OFFICE_HOURS.timeZone, hour: "numeric", minute: "2-digit" }).format(ms); }
  /** online, busy (online but in a session) or offline. */
  function stateOf(l) { return !online(l) ? "off" : busy(l) ? "busy" : "on"; }
  /** The status on a card and in the profile: a dot and the word (a screen reader hears "Status: Online"); offline, the hours too. */
  function statusBadge(l) {
    var state = stateOf(l), until = busy(l) ? BUSY[l.id].until : null;
    var word = state === "on" ? "Online" : state === "busy" ? "In a session" : "Offline";
    var line = state === "off" ? "Available " + hoursOf(l).text + "."
      : state === "busy" ? (until ? "Free again at about " + clockAt(until) + ". You can book a time now." : "You can book a time now.") : "";
    return '<div class="avail is-' + state + '" data-status="' + esc(l.id) + '" data-state="' + state + '">' +
      '<p class="avail-state"><span class="ho-sr">Status: </span><i aria-hidden="true"></i>' + word + "</p>" +
      (line ? '<p class="avail-hours">' + keepTogether(line) + "</p>" : "") + "</div>";
  }

  // ── state ───────────────────────────────────────────────────────────────
  // island and region are no longer chosen on this page (the Location filter sets city and province), but matches() still reads them.
  var F = { q: "", island: "", region: "", province: "", city: "", area: "", firm: "", position: "", photo: false, sort: "photo", page: 0 };
  var view = document.getElementById("view");
  function uniq(list) { return list.filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort(); }
  var AREAS = (function () { var m = {}; LAWYERS.forEach(function (l) { l.areas.forEach(function (a) { m[a] = (m[a] || 0) + 1; }); }); return Object.keys(m).filter(function (a) { return m[a] >= Math.max(3, Math.round(LAWYERS.length / 100)); }).sort(); })(); // enough entries to be worth a filter, whatever the size of the list
  var SOME_DEFAULT = LAWYERS.some(function (l) { return !l.photo; }); // false while the data holds only entries with their own picture
  // The places in the data, for the Location filter: "City, Province", in alphabetical order. Choosing one filters on its
  // city and province, through the same matching as before (matches() below).
  var PLACES = (function () {
    var seen = {}, list = [];
    LAWYERS.forEach(function (l) { var label = l.city + ", " + l.province; if (l.city && !seen[label]) { seen[label] = true; list.push({ label: label, city: l.city, province: l.province }); } });
    return list.sort(function (a, b) { return a.label.localeCompare(b.label); });
  })();
  /** The place chosen in the Location filter, as its label; "" for all locations. */
  function placeLabel() { return F.city ? F.city + ", " + F.province : ""; }
  function group(pos) { pos = pos.toLowerCase(); if (/office/.test(pos)) return "Law or notarial office"; if (/partner|founder|founding|managing|chair|president/.test(pos)) return "Partner"; if (/counsel|consultant/.test(pos)) return "Counsel"; if (/associate/.test(pos)) return "Associate"; return "Attorney"; }

  function matches(l) {
    if (F.island && l.island !== F.island) return false;
    if (F.region && l.region !== F.region) return false;
    if (F.province && l.province !== F.province) return false;
    if (F.city && l.city !== F.city) return false;
    if (F.area && l.areas.indexOf(F.area) < 0) return false;
    if (F.firm && l.firm !== F.firm) return false;
    if (F.position && group(l.position) !== F.position) return false;
    if (F.photo && !l.photo) return false;
    if (F.q) { var hay = (l.name + " " + l.firm + " " + l.city + " " + l.areas.join(" ")).toLowerCase(); if (F.q.toLowerCase().split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false; }
    return true;
  }
  function sorted(list) {
    var by = {
      photo: function (a, b) { return (b.photo ? 1 : 0) - (a.photo ? 1 : 0) || a.name.localeCompare(b.name); },
      name: function (a, b) { return a.name.localeCompare(b.name); },
      firm: function (a, b) { return a.firm.localeCompare(b.firm) || a.name.localeCompare(b.name); },
      experience: function (a, b) { return (years(b) || -1) - (years(a) || -1) || a.name.localeCompare(b.name); },
    };
    return list.slice().sort(by[F.sort] || by.photo);
  }

  // ── the Notary Directory ─────────────────────────────────────────────────────────
  function options(list, current, any) { return '<option value="">' + esc(any) + "</option>" + list.map(function (v) { return '<option value="' + esc(v) + '"' + (v === current ? " selected" : "") + ">" + esc(v) + "</option>"; }).join(""); }

  // The lawyer's card (cardTop below is its shared top): a crimson banner with the seal in outline, the picture in a white frame across the banner's lower edge,
  // then everything centred: name, position and firm, a short maroon rule, place and practice areas, the service, and the
  // rating with one action, "View Profile". Selecting a lawyer happens in the profile, not on the card.
  var CARD_WAVES = '<svg class="card-waves" viewBox="0 0 600 200" preserveAspectRatio="none"><path d="M0 150C120 96 220 180 340 120S520 40 600 70V200H0z" fill="rgba(255,255,255,.075)"/><path d="M0 186C140 132 260 196 380 150S540 92 600 112V200H0z" fill="rgba(255,255,255,.07)"/><path d="M180 0C300 62 420 12 600 34V0z" fill="rgba(255,255,255,.05)"/></svg>';
  var CARD_SEAL = (function () {
    // the hero seal's geometry, as white line-art: one scalloped outline (28 arcs), a thin inner circle, the same sign and stars
    var n = 28, R = 104, r = 13, d = R * Math.cos(Math.PI / n) + Math.sqrt(r * r - Math.pow(R * Math.sin(Math.PI / n), 2)), path = "", k;
    for (k = 0; k <= n; k++) { var ang = (k - 0.5) / n * Math.PI * 2, x = (120 + Math.cos(ang) * d).toFixed(1), y = (120 + Math.sin(ang) * d).toFixed(1); path += k ? "A" + r + " " + r + " 0 0 1 " + x + " " + y : "M" + x + " " + y; }
    return '<svg class="card-seal" viewBox="0 0 240 240"><path d="' + path + 'Z" fill="rgba(74,6,18,.3)" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><circle cx="120" cy="120" r="91" fill="none" stroke="#fff" stroke-width="1.5"/>' +
      '<defs><path id="card-seal-arc" d="M 120 120 m -73 0 a 73 73 0 1 1 146 0"/></defs>' +
      '<text class="arc" fill="#fff" font-family="Manrope, sans-serif" font-weight="700" font-size="14.5" letter-spacing="1.3"><textPath href="#card-seal-arc" startOffset="50.4%" text-anchor="middle">LAGDA IO CERTIFIED</textPath></text>' +
      '<g fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(98 68)"><path d="M26 2H8a6 6 0 0 0-6 6v30a6 6 0 0 0 6 6h14"/><path d="M11 14h14M11 23h9"/><path d="m24 40 3-9 14-14 6 6-14 14z"/></g>' +
      '<text x="120" y="153" text-anchor="middle" fill="#fff" font-family="Manrope, sans-serif" font-weight="800" font-size="28">E-Notary</text><path d="M92 165h56" stroke="#fff" stroke-width="1.4"/>' +
      '<g fill="#fff">' + starAt(98, 183, 6.2) + starAt(120, 187, 6.2) + starAt(142, 183, 6.2) + "</g></svg>";
  })();
  var CARD_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  /**
   * The top of a lawyer's card, shared by the directory's result card and the request's lawyer card so the two cannot drift apart:
   * the banner with its waves and seal, the picture in its white frame across the banner's edge, then the name, "position · firm",
   * the maroon rule and the place, and last the notary's status (online or offline). o.open: the picture and the name open the
   * profile (the result card). o.areas: add the practice areas. o.h: the heading's tag. o.id: the id given to the name, which
   * labels the card. o.after: what comes between the place and the status.
   */
  function cardShape(l) { var r = whole(l) ? l.photoW / l.photoH : 0; return whole(l) ? " wide" + (r > 1.3 ? " landscape" : r < 0.8 ? " tall" : "") : ""; }
  function cardTop(l, o) {
    var big = whole(l), ratio = big ? l.photoW / l.photoH : 0, name = title(l), h = o.h || "h3";
    var areas = function (n) { return esc(l.areas.slice(0, n).join(" · ")) + (l.areas.length > n ? " +" + (l.areas.length - n) : ""); };
    var img = big ? '<img class="front" src="' + esc(l.photo) + '" alt="" width="' + l.photoW + '" height="' + l.photoH + '">' : pic(l);
    var frame = 'class="portrait' + (big ? " entire" : "") + (o.open ? "" : " flow-photo") + '"' + (big ? ' style="--r:' + ratio.toFixed(4) + '"' : "");
    return '<div class="card-banner" aria-hidden="true">' + CARD_WAVES + CARD_SEAL + "</div>" +
      (o.open ? '<button type="button" ' + frame + ' data-open="' + esc(l.id) + '" aria-label="View the profile of ' + esc(name) + '">' + img + "</button>" : "<div " + frame + ">" + img + "</div>") +
      '<div class="card-body">' +
        "<" + h + ' class="card-h">' + (o.open ? '<button type="button" class="card-name" id="' + esc(o.id) + '" data-open="' + esc(l.id) + '">' + esc(name) + "</button>" : '<span class="card-name" id="' + esc(o.id) + '">' + esc(name) + "</span>") + "</" + h + ">" +
        '<p class="card-role">' + esc(l.position || "Attorney") + " <i>·</i> " + esc(l.kind === "office" ? l.city : l.firm) + "</p>" +
        '<span class="card-rule" aria-hidden="true"></span>' +
        '<div class="card-facts"><span class="meta">' + ICON.pin + "<span>" + esc(l.city + ", " + l.province) + "</span></span>" +
          (o.areas && l.areas.length ? '<i class="sep" aria-hidden="true"></i><span class="meta">' + ICON.brief + '<span class="a3">' + areas(3) + '</span><span class="a2">' + areas(2) + "</span></span>" : "") + "</div>" +
        (o.after || "") +
        statusBadge(l) +
      "</div>";
  }
  function card(l) {
    var name = title(l);
    return '<article class="card' + cardShape(l) + '" data-id="' + esc(l.id) + '" aria-labelledby="cn-' + esc(l.id) + '">' +
      cardTop(l, { open: true, areas: true, h: "h3", id: "cn-" + l.id, after: '<span class="card-pill">' + ICON.seal + (l.notaryAdvertised ? "Notary Public" : "Notarization") + "</span>" }) +
      '<div class="card-foot solo"><button type="button" class="card-view" data-open="' + esc(l.id) + '" aria-label="View the profile of ' + esc(name) + '">View Profile' + CARD_ARROW + "</button></div>" +
    "</article>";
  }

  // The landing: what this place is and who is in it. How it works follows it (how() below).
  function hero() {
    var faces = LAWYERS.filter(function (l) { return l.photo && l.kind !== "office" && !l.wide; });
    // A fixed pick, spread across firms and cities, so the page looks the same on every visit.
    var want = ["arturo-t-del-rosario-jr", "cindy-a-ilagan-cayco", "amador-l-simando", "maria-ahren-p-vergara", "myra-s-montecalvo-quilatan"];
    var picked = want.map(function (id) { return faces.filter(function (l) { return l.id === id; })[0]; }).filter(Boolean);
    faces.forEach(function (l) { if (picked.length < 5 && picked.indexOf(l) < 0) picked.push(l); });
    LAWYERS.forEach(function (l) { if (picked.length < 5 && l.kind !== "office" && picked.indexOf(l) < 0) picked.push(l); }); // too few photos: the default portrait fills in
    var firms = uniq(LAWYERS.map(function (l) { return l.firm; })).length;

    // The scalloped seal: a ring of small circles round a disc.
    var bumps = ""; for (var b = 0; b < 28; b++) { var ang = b / 28 * Math.PI * 2; bumps += '<circle cx="' + (120 + Math.cos(ang) * 104).toFixed(1) + '" cy="' + (120 + Math.sin(ang) * 104).toFixed(1) + '" r="13"/>'; }
    var star = starAt;
    var seal = '<svg class="hero-seal" viewBox="-14 -14 290 268" role="img" aria-label="LAGDA IO Certified E-Notary seal">' +
      '<g fill="#8C1D3F">' + bumps + '<circle cx="120" cy="120" r="106"/></g>' +
      '<circle cx="120" cy="120" r="92" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.6"/>' +
      '<circle cx="120" cy="120" r="64" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>' +
      '<defs><path id="seal-arc" d="M 120 120 m -78 0 a 78 78 0 1 1 156 0"/></defs>' +
      '<text fill="#fff" font-family="Manrope, sans-serif" font-weight="700" font-size="14" letter-spacing="2"><textPath href="#seal-arc" startOffset="50.6%" text-anchor="middle">LAGDA IO CERTIFIED</textPath></text>' +
      '<g fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" transform="translate(98 68)"><path d="M26 2H8a6 6 0 0 0-6 6v30a6 6 0 0 0 6 6h14"/><path d="M11 14h14M11 23h9"/><path d="m24 40 3-9 14-14 6 6-14 14z"/></g>' +
      '<text x="120" y="153" text-anchor="middle" fill="#fff" font-family="Manrope, sans-serif" font-weight="800" font-size="28">E-Notary</text>' +
      '<path d="M88 165h64" stroke="rgba(255,255,255,.6)" stroke-width="1.2"/>' +
      '<g fill="#fff">' + star(98, 183, 6.2) + star(120, 187, 6.2) + star(142, 183, 6.2) + "</g>" +
      '<g fill="none" stroke="#C2185B" stroke-width="3.4" stroke-linecap="round"><path d="M228 4l8-20"/><path d="M240 18l22-12"/><path d="M246 40h24"/></g></svg>';

    var sunRays = ""; for (var r = 0; r < 16; r++) { var ra = r / 16 * Math.PI * 2, len = r % 2 ? 46 : 62; sunRays += '<path d="M' + (Math.cos(ra) * 26).toFixed(1) + " " + (Math.sin(ra) * 26).toFixed(1) + "L" + (Math.cos(ra) * len).toFixed(1) + " " + (Math.sin(ra) * len).toFixed(1) + '"/>'; }
    var towers = ""; [[980, 250, 60], [1050, 330, 44], [1110, 210, 70], [1200, 300, 52], [1262, 240, 64], [1340, 320, 46], [1400, 270, 58]].forEach(function (tw) { towers += '<rect x="' + tw[0] + '" y="' + (520 - tw[1]) + '" width="' + tw[2] + '" height="' + tw[1] + '" rx="2"/>'; });
    var columns = ""; for (var c = 0; c < 5; c++) columns += '<rect x="' + (18 + c * 42) + '" y="660" width="22" height="220" rx="3"/>';
    var backdrop = '<svg class="hero-bg" viewBox="0 0 1840 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<g fill="#BFDDF4" opacity=".28">' + towers + "</g>" +
      '<g fill="#C9E1F5" opacity=".55"><path d="M0 640l126-52 126 52v14H0z"/>' + columns + "</g>" +
      '<path d="M-40 800C220 700 420 720 620 850L-40 880z" fill="#9CCBF0" opacity=".55"/>' +
      '<path d="M-40 840C200 770 400 780 580 880L-40 900z" fill="#F4B6C6" opacity=".7"/>' +
      '<path d="M1500 420C1640 380 1760 300 1880 210V330C1780 420 1650 480 1500 500z" fill="#A9D2F3" opacity=".6"/>' +
      '<path d="M1460 470C1620 470 1760 560 1880 700V790C1740 640 1610 560 1460 540z" fill="#F4B6C6" opacity=".62"/>' +
      '<path d="M1500 505C1640 505 1770 580 1880 690V640C1770 540 1640 480 1500 478z" fill="#FBE3EA" opacity=".9"/>' +
      '<g transform="translate(1740 440)" stroke="#E9B84C" stroke-width="7" stroke-linecap="round" fill="#E9B84C" opacity=".9">' + sunRays + '<circle r="24" stroke="none"/></g>' +
      '<g fill="#E9B84C" opacity=".9">' + star(1808, 356, 15) + star(1806, 544, 13) + star(1626, 446, 9) + "</g></svg>";

    var ico = {
      people: '<svg viewBox="0 0 48 40"><circle cx="24" cy="11" r="6.500"/><path d="M12 36c1-8 5.500-12 12-12s11 4 12 12"/><circle cx="9" cy="14" r="4.500"/><path d="M2 32c.600-5 3-8 7-8.500"/><circle cx="39" cy="14" r="4.500"/><path d="M46 32c-.600-5-3-8-7-8.500"/></svg>',
      scales: '<svg viewBox="0 0 48 40"><path d="M24 4v32M14 36h20M8 10h32M24 6l-4 4M24 6l4 4"/><path d="M8 10 2 24h12zM40 10l-6 14h12z"/><path d="M2 24a6 6 0 0 0 12 0M34 24a6 6 0 0 0 12 0"/></svg>',
    };
    var stat = function (icon, n, label) { return '<div class="stat">' + icon + "<div><dt>" + n + "</dt><dd>" + label + "</dd></div></div>"; };

    return '<section class="hero">' + backdrop + '<div class="hero-in">' +
      '<div class="hero-text"><p class="hero-eyebrow">Legal services <i>\u2022</i> Trusted professionals <i>\u2022</i> Philippines</p>' +
        '<h1>Choose the <em>lawyer<svg viewBox="0 0 220 22" preserveAspectRatio="none" aria-hidden="true"><path d="M4 14C60 4 120 3 216 9" /><path d="M150 17c24-4 44-5 64-4"/></svg></em> who will notarize your document</h1>' +
        "<p>Browse lawyers and law offices across the Philippines. Read each one\u2019s profile and choose the notary you trust. Online notarial sessions are not open yet: choose a notary to register your interest, and we\u2019ll email you when you can book.</p>" +
        '<div class="hero-acts"><a class="btn big" href="#find">Find a lawyer</a><a class="btn outline big" href="#how">How it works</a></div>' +
        '<dl class="hero-stats">' + stat(ico.people, LAWYERS.length, "lawyers and offices") + stat(ico.scales, firms, "law firms") + "</dl></div>" +
      '<div class="hero-faces">' + picked.map(function (l, i) {
        return '<figure class="face f' + i + '">' + pic(l, title(l)) + '<figcaption><b>' + esc(title(l)) + "</b><span>" + esc(l.firm) + "</span></figcaption></figure>";
      }).join("") + seal + "</div>" +
    "</div></section>";
  }

  // How it works: a remote notarization on LAGDA, from the request to the notarized document, in ten steps.
  // Two columns on a wide screen that read down (I to V, then VI to X), one column on a phone.
  var HOW = [
    ["Choose a notary", "Browse the directory and select a commissioned notary public who is online. Notaries receive requests " + OFFICE_HOURS.text + "."],
    ["Verify your identity", "Confirm your identity with a government-issued ID and a selfie through LAGDA's identity verification partner."],
    ["Submit your request", "State the notarial act and the document, and confirm that you will be in the Philippines during the session. Wills and certified copies of public records cannot be notarized online."],
    ["Review by the notary", "The notary verifies their own identity, then accepts or declines your request. If a request is declined, you may choose another notary."],
    ["Prepare the session", "Upload the final PDF of your document (up to 20 MB; every file is scanned for malware) and state your address during the notarization."],
    ["Appear by video", "The notary opens the session room, and you appear before the notary by live video, which is not recorded. Both parties confirm that they are in the Philippines."],
    ["Confirm identity and document", "The notary confirms your identity during the call, and you finalize the document. A finalized document can no longer be replaced."],
    ["The notarial act", "The notary selects the act (acknowledgment, jurat or signature witnessing) and states the fee, if any. You review the details and approve."],
    ["Notarization and register", "The notary affixes the notarial block. The document receives a register entry (document, page, book and series) and a LAGDA-NOT verification code on every page, with a QR code on its information sheet. Any fee is paid directly to the notary."],
    ["Copies and verification", "Request certified true copies when you need them. Anyone can verify a notarized document at lagda.io/verify-notarized."],
  ];
  var ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  function how() {
    // The numeral is for the eye; a screen reader has the list's own numbering. The verification address is a link to that page.
    var text = function (t) { return keepTogether(t).replace("lagda.io/verify-notarized", '<a href="/verify-notarized">lagda.io/verify-notarized</a>'); };
    return '<section class="how" id="how" aria-labelledby="how-h"><div class="how-in">' +
      '<div class="how-head"><h2 id="how-h">How it works</h2><p>A remote notarization on LAGDA, from request to notarized document.</p></div>' +
      '<ol class="how-steps" role="list">' + HOW.map(function (st, i) {
        return '<li><span class="how-n" aria-hidden="true">' + ROMAN[i] + "</span><div><h3>" + esc(st[0]) + "</h3><p>" + text(st[1]) + "</p></div></li>";
      }).join("") + "</ol></div></section>";
  }

  function market() {
    view.innerHTML = hero() + how() + '<div class="wrap" id="find">' +


      // The filters: search, then the location, practice area, law firm and position (and "With a photo" when some have none).
      '<section class="tools' + (SOME_DEFAULT ? "" : " four") + '" aria-label="Filters">' +
        '<div class="field"><label for="f-q">Search</label><input id="f-q" type="search" placeholder="Name, firm or practice area" value="' + esc(F.q) + '"></div>' +
        '<div class="field"><label for="f-location">Location</label><select id="f-location">' + options(PLACES.map(function (p) { return p.label; }), placeLabel(), "All locations") + "</select></div>" +
        '<div class="field"><label for="f-area">Practice area</label><select id="f-area">' + options(AREAS, F.area, "Any practice area") + "</select></div>" +
        '<div class="field"><label for="f-firm">Law firm</label><select id="f-firm">' + options(uniq(LAWYERS.map(function (l) { return l.firm; })), F.firm, "Any firm") + "</select></div>" +
        '<div class="field"><label for="f-position">Position</label><select id="f-position">' + options(["Partner", "Counsel", "Associate", "Attorney", "Law or notarial office"], F.position, "Any position") + "</select></div>" +
        (SOME_DEFAULT ? '<label class="check"><input type="checkbox" id="f-photo"' + (F.photo ? " checked" : "") + "> With a photo</label>" : "") + "</section>" + // pointless when everyone has one

      '<div class="results" id="results"><h2 id="count"></h2><button type="button" class="clear" id="clear" hidden>Clear filters</button>' +
        '<label class="sort">Sort by <select id="f-sort">' + [["photo", "Default"], ["name", "Name, A to Z"], ["firm", "Law firm"], ["experience", "Most experienced"]].map(function (o) { return '<option value="' + o[0] + '"' + (F.sort === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="grid" id="grid"></div><nav class="pager" id="pager" aria-label="Pages of results" tabindex="-1"></nav></div>';
    list();
  }

  // ── results: a carousel, one page of cards at a time ────────────────────
  // A page is a whole number of rows at every width: 24 cards in three columns, 12 in two, 6 in one.
  var FOUND = [], SIZE = PAGE;
  function calm() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function columns() { var g = document.getElementById("grid"); return g ? getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length || 1 : 3; }
  function pageSize() { var c = columns(); return c >= 3 ? PAGE : c === 2 ? 12 : 6; }
  function pages() { return Math.max(1, Math.ceil(FOUND.length / SIZE)); }
  function pager(n, total) {
    // Never more than seven numbers: 1 ... 8 9 10 ... 18. On a phone the numbers give way to the "Page 3 of 72" label.
    var nums = [], k;
    if (total <= 7) for (k = 0; k < total; k++) nums.push(k);
    else { var from = Math.max(1, Math.min(n - 1, total - 4)), to = Math.min(total - 2, Math.max(n + 1, 3)); nums.push(0); if (from > 1) nums.push(-1); for (k = from; k <= to; k++) nums.push(k); if (to < total - 2) nums.push(-1); nums.push(total - 1); }
    var first = n * SIZE + 1, last = Math.min(FOUND.length, (n + 1) * SIZE);
    return '<button type="button" class="pg-step" data-page="prev" aria-label="Previous page"' + (n === 0 ? ' aria-disabled="true"' : "") + '><span aria-hidden="true">‹</span> Previous</button>' +
      '<ol class="pg-nums">' + nums.map(function (p) { return p < 0 ? '<li class="gap" aria-hidden="true">…</li>' : '<li><button type="button" data-page="' + p + '" aria-label="Page ' + (p + 1) + '"' + (p === n ? ' class="is-on" aria-current="page"' : "") + ">" + (p + 1) + "</button></li>"; }).join("") + "</ol>" +
      '<button type="button" class="pg-step" data-page="next" aria-label="Next page"' + (n === total - 1 ? ' aria-disabled="true"' : "") + '>Next <span aria-hidden="true">›</span></button>' +
      '<p class="pg-label" aria-live="polite"><b id="pg-label">Page ' + (n + 1) + " of " + total + "</b><span>Showing " + first + " to " + last + " of " + FOUND.length + "</span></p>";
  }
  function list(dir) {
    FOUND = sorted(LAWYERS.filter(matches));
    var where = placeLabel(); // "All locations": no place is named
    document.getElementById("count").innerHTML = FOUND.length + (FOUND.length === 1 ? " result" : " results") + (where ? " <span>in " + esc(where) + "</span>" : "");
    var active = F.q || F.island || F.region || F.province || F.city || F.area || F.firm || F.position || F.photo;
    document.getElementById("clear").hidden = !active;
    var grid = document.getElementById("grid"), nav = document.getElementById("pager");
    grid.className = "grid";
    if (!FOUND.length) {
      nav.hidden = true; nav.innerHTML = "";
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>No lawyer or office matches these filters</h3><p>Try another place or a different word, or clear the filters to see everyone.</p><button type="button" class="btn" data-clear>Clear filters</button></div>';
      return;
    }
    SIZE = pageSize();
    var total = pages(); F.page = Math.max(0, Math.min(total - 1, F.page));
    grid.innerHTML = FOUND.slice(F.page * SIZE, (F.page + 1) * SIZE).map(card).join("");
    if (dir) { void grid.offsetWidth; grid.className = "grid " + (dir > 0 ? "go-next" : "go-prev"); }
    nav.hidden = false;
    nav.innerHTML = total > 1 ? pager(F.page, total) : '<p class="pg-label"><b id="pg-label">Page 1 of 1</b><span>Showing all ' + FOUND.length + "</span></p>";
  }
  /** Move to another page: "prev", "next", "first", "last" or a page number from 0. Keeps the pager focused and brings the top of the results into view. */
  function turn(to) {
    var total = pages(), was = F.page, key = String(to);
    to = to === "prev" ? was - 1 : to === "next" ? was + 1 : to === "first" ? 0 : to === "last" ? total - 1 : Number(to);
    to = Math.max(0, Math.min(total - 1, to));
    if (to === was || isNaN(to)) return;
    F.page = to; list(to > was ? 1 : -1);
    var again = document.querySelector('#pager [data-page="' + (key === "prev" || key === "next" ? key : to) + '"]');
    if (again && again.offsetParent === null) again = null; // the numbers are hidden on a phone
    (again || document.getElementById("pager")).focus({ preventScroll: true });
    var head = document.getElementById("results"); if (head) head.scrollIntoView({ block: "start", behavior: calm() ? "auto" : "smooth" });
  }
  function reset() { F.q = F.island = F.region = F.province = F.city = F.area = F.firm = F.position = ""; F.photo = false; F.page = 0; market(); }
  // A narrower or wider window changes how many cards make a page: stay on the page that holds the same cards.
  var sizing;
  window.addEventListener("resize", function () { clearTimeout(sizing); sizing = setTimeout(function () { if (!document.getElementById("grid") || !FOUND.length) return; var s = pageSize(); if (s !== SIZE) { F.page = Math.floor(F.page * SIZE / s); list(); } }, 150); });

  // ── pop-up ──────────────────────────────────────────────────────────────
  var lastFocus = null;
  var PI = {
    doc: '<svg viewBox="0 0 24 24"><path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="M8.500 8h6M8.500 12h3.500"/><path d="m13 19 1.200-3.600 6-6 2.400 2.400-6 6z"/></svg>',
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c.800-4.500 3.800-7 8-7s7.200 2.500 8 7"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.700 5.600 6.100.900-4.400 4.300 1 6.100-5.400-2.900-5.400 2.900 1-6.100-4.400-4.300 6.100-.900z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.200 7-11a7 7 0 1 0-14 0c0 4.800 7 11 7 11z"/><circle cx="12" cy="10" r="2.600"/></svg>',
    firm: '<svg viewBox="0 0 24 24"><path d="M5 21V4h10v17M15 9h4v12M3 21h18"/><path d="M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1"/></svg>',
    cap: '<svg viewBox="0 0 24 24"><path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11.500V16c1.600 1.600 3.600 2.400 6 2.400s4.400-.800 6-2.400v-4.500"/></svg>',
    page: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    bank: '<svg viewBox="0 0 24 24"><path d="M3 9l9-5 9 5v2H3zM5 11v7M9.500 11v7M14.500 11v7M19 11v7M3 21h18"/></svg>',
    peso: '<svg viewBox="0 0 24 24"><path d="M8 21V4h5a5 5 0 0 1 0 10H8M5 8h13M5 11.500h13"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 4.500 3.400 7.800 8 9 4.600-1.200 8-4.500 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
    scales: '<svg viewBox="0 0 120 90"><path d="M60 8v74M38 82h44M22 22h76M60 12l-7 10M60 12l7 10"/><path d="M22 22 8 54h28zM98 22 84 54h28z"/><path d="M8 54a14 10 0 0 0 28 0M84 54a14 10 0 0 0 28 0"/><circle cx="60" cy="8" r="4"/></svg>',
  };
  // The guilloche behind the portrait: fine rotated ellipses, pale blue with a faint pink. A wide oval for a wide picture.
  function rosette(wide) {
    var s = "", k, w = wide ? 190 : 100, h = wide ? 112 : 100;
    if (wide) {
      for (k = 0; k < 30; k++) s += '<ellipse rx="' + (w - 6) + '" ry="' + (h * 0.56).toFixed(1) + '" transform="rotate(' + ((k - 14.5) * 2.4).toFixed(1) + ')"/>';
      s += '<g stroke="#EFC4D0">'; for (k = 0; k < 16; k++) s += '<ellipse rx="' + (w * 0.86).toFixed(1) + '" ry="' + (h * 0.8).toFixed(1) + '" transform="rotate(' + ((k - 7.5) * 2.2).toFixed(1) + ')"/>'; s += "</g>";
      s += '<ellipse rx="' + (w - 2) + '" ry="' + (h - 2) + '"/><ellipse rx="' + (w - 5) + '" ry="' + (h - 5) + '"/>';
    } else {
      for (k = 0; k < 36; k++) s += '<ellipse rx="94" ry="38" transform="rotate(' + k * 5 + ')"/>';
      s += '<g stroke="#EFC4D0">'; for (k = 0; k < 24; k++) s += '<ellipse rx="80" ry="54" transform="rotate(' + k * 7.5 + ')"/>'; s += "</g>";
      s += '<circle r="98"/><circle r="95"/><circle r="60"/>';
    }
    return '<svg class="pf-rosette" viewBox="' + -w + " " + -h + " " + w * 2 + " " + h * 2 + '" aria-hidden="true"><g fill="none" stroke="#B4CFEA" stroke-width=".45">' + s + "</g></svg>";
  }
  // The small scalloped seal on the corner of the portrait.
  function miniSeal() {
    var bumps = ""; for (var b = 0; b < 18; b++) { var a = b / 18 * Math.PI * 2; bumps += '<circle cx="' + (50 + Math.cos(a) * 41).toFixed(1) + '" cy="' + (50 + Math.sin(a) * 41).toFixed(1) + '" r="7.6"/>'; }
    return '<svg class="pf-seal" viewBox="0 0 100 100" aria-hidden="true"><g fill="#8C1D3F">' + bumps + '<circle cx="50" cy="50" r="42"/></g><circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.6"/><g fill="#fff">' + starAt(50, 51, 19) + "</g></svg>";
  }
  function profile(id) {
    var l = byId(id); if (!l) return;
    closeMenu(false);
    var y = years(l), big = whole(l), place = l.city + ", " + l.province, on = online(l);
    lastFocus = document.activeElement;
    var about = l.about || (l.kind === "office" ? "A " + (l.position || "law office").toLowerCase() + " in " + l.city + " offering notarial services." : (/^[aeiou]/i.test(l.position || "lawyer") ? "An " : "A ") + (l.position || "lawyer").toLowerCase() + " at " + l.firm + ", " + l.city + ".");
    var link = l.profile || l.website;
    var head = function (text) { return "<h3>" + text + "</h3>"; };
    var none = '<dd class="none">Not provided</dd>';

    // Centre: the badge. An office's own picture is framed whole, as wide as the badge allows.
    var badge = '<section class="pf-badge"><span class="pf-hang" aria-hidden="true"></span>' +
      '<p class="pf-brand"><img src="assets/brand-logo.png" alt="LAGDA"><i aria-hidden="true"></i><b>eNotary</b></p>' +
      '<div class="pf-portrait' + (big ? " entire" + (l.photoW > l.photoH * 1.3 ? " landscape" : l.photoW > l.photoH * 0.8 ? " squarish" : "") + '" style="width:min(100%, ' + Math.round((l.photoW > l.photoH * 1.3 || l.photoW <= l.photoH * 0.8 ? 300 : 236) * l.photoW / l.photoH) + 'px)' : "") + '">' + rosette(big && l.photoW > l.photoH * 1.3) +
        '<div class="pf-photo">' + (big ? '<img src="' + esc(l.photo) + '" alt="" width="' + l.photoW + '" height="' + l.photoH + '">' : pic(l)) + '</div><span class="pf-bar" aria-hidden="true"></span>' + miniSeal() + "</div>" +
      '<h2 id="pf-name">' + esc(title(l)) + "</h2>" +
      (l.position ? '<p class="pf-role">' + esc(l.position) + "</p>" : "") +
      (l.kind === "office" ? "" : '<p class="pf-firm">' + esc(l.firm) + "</p>") +
      '<p class="pf-place">' + PI.pin + "<span>" + esc(place) + "</span></p>" +
      '<p class="pf-notar">' + ICON.seal + (l.notaryAdvertised ? "<b>Notary Public</b>" : "<b>Notarization</b>") + "</p>" +
      statusBadge(l) +
      '<p class="pf-about">' + esc(about) + "</p></section>";

    // Left: credentials, from the lawyer's own published profile.
    var left = '<div class="pf-col pf-left"><section class="pf-sec">' + head("Credentials") + '<dl class="pf-dl">' +
        "<dt>Education</dt>" + (l.education ? "<dd>" + esc(l.education) + "</dd>" : none) +
        "<dt>Practice areas</dt>" + (l.areas.length ? "<dd>" + esc(l.areas.join(", ")) + "</dd>" : none) +
        (l.lawyers && l.lawyers.length ? '<dt>Lawyers</dt><dd class="pf-people">' + l.lawyers.map(esc).join("<br>") + "</dd>" : "") +
        (l.barYear ? "<dt>Admitted to the Bar</dt><dd>" + l.barYear + (y ? " (" + y + " years)" : "") + "</dd>" : "") + "</dl></section></div>";

    // Right: where they are, and where eNotary stands.
    var right = '<div class="pf-col pf-right"><section class="pf-sec">' + head("Contact") + '<dl class="pf-dl"><dt>Office</dt><dd>' + esc(l.address || place) + "</dd></dl>" +
        (link ? '<p class="pf-link"><a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Their own profile page</a></p>' : "") + "</section>" +
      '<section class="pf-sec">' + head("Online notarization") + '<p class="pf-soon">' + SOON + "</p>" +
        '<p class="pf-fine">Selecting registers your interest. Nothing is booked, and nothing is charged.</p></section></div>';

    document.getElementById("modal-root").innerHTML = '<div class="veil" id="veil"><div class="pf" role="dialog" aria-modal="true" aria-labelledby="pf-name">' +
      '<div class="pf-scroll"><div class="pf-cols"><button type="button" class="pf-x" data-close aria-label="Close">×</button>' + badge + left + right + "</div></div>" +
      '<div class="pf-foot"><div class="pf-wait" id="pf-wait" role="note" aria-label="Why this notary cannot be selected"' + (on ? " hidden" : "") + ">" + (on ? "" : waitNote(l)) + "</div>" +
        '<button type="button" class="pf-wait-chip" data-wait-show hidden>' + CLOCK + "Why can\u2019t I select this notary?</button>" +
        '<p class="pf-note">The profile shown is the lawyer\'s own published information. Choose this notary to be told when you can book.</p>' +
        '<button type="button" class="btn outline" data-close>Close</button><span class="pf-sel" data-sel-wrap><button type="button" class="btn" data-select="' + esc(l.id) + '" aria-describedby="pf-wait"' + (on ? "" : " disabled") + ">Select this notary</button></span></div></div></div>";
    WAIT_HIDDEN = false;
    document.body.style.overflow = "hidden";
    document.querySelector(".pf .pf-x").focus();
  }
  /** Keeps Tab inside an open dialog. */
  function trap(e, box) {
    var f = [].filter.call(box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'), function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1], at = document.activeElement;
    if (!box.contains(at)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  }
  /** Closes whatever is open in #modal-root: the profile, the document viewer, or the report dialog. */
  function closeProfile() { document.getElementById("modal-root").innerHTML = ""; document.body.style.overflow = ""; if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  // ── choosing a notary: sign in, verify your identity, register your interest ──
  // Online notarial sessions are not open yet. Choosing a notary does three real things and nothing more:
  //   1. a visitor who is not signed in to LAGDA is sent to sign in, and comes back to the same choice
  //      (the choice waits in sessionStorage, which survives the trip in the same tab);
  //   2. the account's identity verification, where LAGDA offers it (GET /api/me/identity; a 404 means it is not
  //      offered, and the step is skipped). The check itself is the partner's page, opened in a new tab as the web app
  //      does it (src/app/components/identity/provider-session.ts), or in this tab on a phone;
  //   3. where LAGDA offers requests to notaries (GET /api/me/enotary/invitations answers 200), the last step is "Request this notary":
  //      POST /api/me/enotary/invitations, then the person is taken to the request's page in the app (/app/enotary/requests/<id>),
  //      where the private link and QR code for the notary are. Where that answers 404 the step is what it was: the interest is
  //      registered through LAGDA's public inquiry form (POST /api/public/inquiries, kind "waitlist").
  var CI = {
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    out: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  };
  var STEPS = [["Notary selected", "Your choice"], ["Your LAGDA account", "Signed in"], ["Verify your identity", "ID and face check"], ["Register your interest", "We email you"]];
  var PENDING = "lagda-directory-selection", DONE = "lagda-directory-registered", CHECK = "lagda-directory-check";
  var FAST = 3000, SLOW = 10000, WAIT = 15 * 60 * 1000;
  var ME; // undefined: not asked yet; null: not signed in; { name, email }: signed in
  var SEL = null; // { lawyer, step: "identity" | "interest" | "done", idv: phase, outcome: "yes" | "no" | "not offered", error, busy }
  var poll = null, pollEvery = 0, pollUntil = 0, asking = false;
  var INV; // undefined: not asked yet; null: requests to notaries are not offered (the waitlist step); { list, needsIdentity }: offered

  function store(key, value) { try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* this visit only */ } }
  function stored(key) { try { return JSON.parse(sessionStorage.getItem(key) || "null"); } catch (err) { return null; } }
  function cookie(name) { var m = new RegExp("(?:^|;\\s*)" + name + "=([^;]*)").exec(document.cookie || ""); if (!m) return ""; try { return decodeURIComponent(m[1]); } catch (err) { return m[1]; } }
  /** One call to LAGDA's API on this origin. Never rejects: { ok, status, data, code }. status 0: it could not be reached. */
  function api(method, path, body) {
    var opts = { method: method, credentials: "include", headers: { Accept: "application/json" } };
    if (method !== "GET") { var csrf = cookie("lagda_csrf"); if (csrf) opts.headers["X-CSRF-Token"] = csrf; }
    if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
    if (!window.fetch || !/^https?:$/.test(location.protocol)) return Promise.resolve({ ok: false, status: 0, data: null, code: "" });
    return fetch("/api" + path, opts).then(function (res) {
      return res.text().then(function (text) {
        var data = null; try { data = text ? JSON.parse(text) : null; } catch (err) { data = null; }
        var code = data && data.error && typeof data.error === "object" ? data.error.code || "" : "";
        return { ok: res.ok, status: res.status, data: data, code: code };
      });
    }).catch(function () { return { ok: false, status: 0, data: null, code: "" }; });
  }
  function signedIn() {
    return api("GET", "/me").then(function (r) {
      if (r.ok && r.data && r.data.email) { var p = r.data.profile || {}; ME = { name: String(p.fullName || p.displayName || r.data.email).slice(0, 120), email: r.data.email }; }
      else ME = null;
      return ME;
    });
  }
  /** Where sign-in sends the visitor back: this directory, reopening the chosen notary. LAGDA's sign-in accepts exactly this address. */
  function signInUrl(id) {
    var back = "/enotary-directory/" + (id && /^[a-z0-9-]{1,80}$/.test(id) ? "?select=" + id : "");
    return "/sign-in?returnTo=" + encodeURIComponent(back);
  }
  function done() { return stored(DONE) || []; }
  /** Whether LAGDA offers requests to notaries: asked once, after the identity step. 404 (or anything unreadable) keeps the waitlist step. */
  function probeRequests() {
    if (INV !== undefined) return Promise.resolve(INV);
    return api("GET", "/me/enotary/invitations").then(function (r) {
      if (r.ok && r.data && Array.isArray(r.data.invitations)) INV = { list: r.data.invitations, needsIdentity: false };
      else if (r.status === 403 && r.code === "client_identity_required") INV = { list: [], needsIdentity: true };
      else if (r.status === 401) return undefined; // signed out meanwhile: ask again after signing in
      else INV = null;
      return INV;
    });
  }
  function openRequestFor(id) {
    var list = INV && INV.list || [];
    for (var i = 0; i < list.length; i++) { var q = list[i]; if (q && q.notary && q.notary.directoryId === id && (q.status === "awaiting" || q.status === "claimed")) return q; }
    return null;
  }
  function requestPath(id) { return "/app/enotary/requests/" + encodeURIComponent(id); }
  function plainError(r) {
    if (r.status === 0) return "Could not reach LAGDA. Check your connection and try again.";
    if (r.status === 401) return "Your LAGDA session has ended. Sign in again to continue.";
    if (r.status === 403) return "This action could not be verified. Reload the page and try again.";
    if (r.status === 429) return "Too many tries in a short time. Wait a minute, then try again.";
    if (r.status === 422 || r.status === 400) return "Some details were not accepted. Check them and try again.";
    return "That could not be done right now. Please try again.";
  }

  function stepList() { return INV ? STEPS.slice(0, 3).concat([["Request this notary", "Link and QR code"]]) : STEPS; }
  function flowTop(head, sub, at) {
    var STEPS = stepList(), n = STEPS.length;
    return '<section class="flow-top"><svg class="flow-wave" viewBox="0 0 1840 300" preserveAspectRatio="none" aria-hidden="true"><path d="M1180 300C1420 250 1640 160 1880 40v260z" fill="#A9D2F3" opacity=".500"/><path d="M1320 300c200-30 380-90 560-190v190z" fill="#F4B6C6" opacity=".550"/><path d="M-40 300C180 220 380 230 560 300z" fill="#C5E0F6" opacity=".700"/></svg>' +
      '<div class="flow-top-in"><p class="hero-eyebrow">' + (INV ? "eNotary request" : "eNotary interest") + ' <i>•</i> ' + esc(title(SEL.lawyer)) + '</p><h1 tabindex="-1" id="flow-h">' + head + "</h1><p>" + sub + "</p>" +
      '<ol class="flow-steps four" aria-label="Steps">' + STEPS.map(function (st, k) { return '<li class="' + (k < at ? "done" : k === at ? "now" : "") + '"' + (k === at ? ' aria-current="step"' : "") + "><span>" + (k < at ? CI.check : k + 1) + "</span><div><b>" + st[0] + "</b><small>" + st[1] + "</small></div></li>"; }).join("") + "</ol>" +
      '<p class="flow-now" aria-hidden="true">' + (at < n ? "Step " + (at + 1) + " of " + n + " <i>·</i> <b>" + STEPS[at][0] + "</b>" : "All " + n + " steps complete") + "</p></div></section>";
  }
  function idWords() { return SEL.outcome === "yes" ? '<span class="state in">Verified</span><br>Verified in LAGDA' : SEL.outcome === "not offered" ? "Not offered on this account" : SEL.outcome === "no" ? '<span class="state wait">Not verified</span>' : '<span class="state wait">Not checked yet</span>'; }
  function lawyerCard(l, state, label) {
    return '<aside class="card flow-lawyer' + cardShape(l) + '" aria-labelledby="fl-name">' + cardTop(l, { open: false, areas: false, h: "h2", id: "fl-name" }) +
      '<div class="flow-rows"><span class="state ' + state + '">' + label + "</span><dl>" +
        "<div><dt>" + PI.shield + "Your identity</dt><dd>" + idWords() + "</dd></div>" +
        (ME ? "<div><dt>" + PI.person + "Signed in as</dt><dd>" + esc(ME.name) + "<br>" + esc(ME.email) + "</dd></div>" : "") +
      "</dl></div></aside>";
  }
  /** The selection, from where it stands. */
  function flow() {
    stopPoll();
    var l = SEL.lawyer, name = esc(title(l)), body = "", bar = "", head, sub, at;
    if (SEL.step === "done") {
      at = STEPS.length; head = "Your interest is saved"; sub = "Online notarial sessions are not open yet. We will email you when you can book.";
      body = '<h3 id="step-h" tabindex="-1">' + PI.shield + 'Interest registered</h3><div class="idv-res ok" role="status">' + CI.check + "<div><b>Your interest in " + name + " is saved.</b><p>Online notarial sessions are not open yet; we'll email " + esc(ME ? ME.email : "you") + " when you can book.</p></div></div>" +
        '<p class="fine left">Nothing was booked, and nothing was charged.</p>';
      bar = '<button type="button" class="btn outline" data-go="market" data-forget>Browse other notaries</button><a class="btn big" href="/app/dashboard">Back to LAGDA</a>';
    } else if (SEL.step === "interest" && INV === undefined) {
      at = 3; head = "One moment"; sub = "Checking what LAGDA offers for this notary.";
      body = '<h3 id="step-h" tabindex="-1">' + CI.mail + '</h3><p class="ho-status" role="status"><i class="spin" aria-hidden="true"></i><span>Checking your account…</span></p>';
      var asked = SEL; probeRequests().then(function () { if (SEL === asked && asked.step === "interest") redraw(false); });
    } else if (SEL.step === "interest" && INV) {
      at = 3; head = "Request this notary"; sub = "Ask " + name + " to take your request. Online notarial sessions are not currently available: LAGDA eNotary is subject to Supreme Court accreditation.";
      var open = openRequestFor(l.id);
      if (INV.needsIdentity) {
        body = '<h3 id="step-h" tabindex="-1">' + PI.shield + 'Verify your identity first</h3><div class="idv-res note" role="status"><span aria-hidden="true">i</span><div><b>Your identity is not verified yet</b><p>A request to a notary needs your LAGDA account to show as verified. It takes about two minutes.</p></div></div>';
        bar = '<button type="button" class="btn outline" data-go="market" data-forget>Browse other notaries</button><button type="button" class="btn big" data-idv-retry data-back-to-identity>Verify my identity</button>';
      } else if (open) {
        body = '<h3 id="step-h" tabindex="-1">' + CI.mail + 'You already asked this notary</h3><div class="idv-res ok" role="status">' + CI.check + "<div><b>Your request to " + name + " is open.</b><p>Its link, QR code and the time it has left are on its page.</p></div></div>";
        bar = '<button type="button" class="btn outline" data-go="market" data-forget>Browse other notaries</button><a class="btn big" href="' + requestPath(open.id) + '">Open your request</a>';
      } else {
        // How this notary is reached: by LAGDA, when the listing has an account, or by an email the client may add.
        var contact = SEL.contact;
        if (contact === undefined && !SEL.contactAsked) {
          SEL.contactAsked = true;
          var askedFor = SEL;
          api("GET", "/me/enotary/listings/" + encodeURIComponent(l.id) + "/contact").then(function (r) {
            askedFor.contact = r.ok && r.data ? r.data : null;
            if (SEL === askedFor) redraw(false);
          });
        }
        var reach;
        if (contact === undefined) reach = '<p class="ho-status" role="status"><i class="spin" aria-hidden="true"></i><span>Checking how to reach this notary…</span></p>';
        else if (contact && contact.accountKnown) reach = '<div class="idv-res ok req-account" role="status">' + CI.check + "<div><b>This notary has a LAGDA account.</b><p>LAGDA emails " + (contact.maskedEmail ? "<b>" + esc(contact.maskedEmail) + "</b> " : "them ") + "when you send the request, so you do not need to add an email. To protect the notary’s inbox, each client can send a limited number of requests a day.</p></div></div>";
        else reach = '<div class="req-email"><label for="req-email"><b>The notary\'s email (optional)</b></label><input id="req-email" type="email" autocomplete="off" inputmode="email" maxlength="254" value="' + esc(SEL.email || "") + '"><p class="fine left">This notary has no LAGDA account yet, so LAGDA cannot email them by itself. If you know their email address, add it. It is kept with the request. Otherwise, give them the link and QR code yourself.</p></div>';
        // Offline: said first, before the form, and "Request this notary" cannot be pressed (syncRequestButton() keeps both current).
        var on = online(l), off = offlineWords(l);
        body = '<h3 id="step-h" tabindex="-1">' + CI.mail + "Request this notary</h3>" +
          '<div class="idv-res note req-off" id="req-offline" role="status" tabindex="-1"' + (on ? " hidden" : "") + '><span aria-hidden="true">i</span><div><b>' + esc(off[0]) + "</b><p>" + keepTogether(off[1]) + "</p></div></div>" +
          '<p class="lead">LAGDA sends your request to the notary. A notary who is on LAGDA finds it on their desk; for one who is not yet, you can give them a private link or QR code yourself. The notary passes an ID and face check before they can answer your request.</p>' +
          '<dl class="summary"><div><dt>Notary</dt><dd>' + name + (l.kind === "office" ? "" : ", " + esc(l.firm)) + "<br>" + esc(l.city + ", " + l.province) + "</dd></div>" +
            "<div><dt>Your name</dt><dd>" + esc(ME.name) + "</dd></div><div><dt>Identity verified in LAGDA</dt><dd>Yes</dd></div></dl>" +
          detailsForm(SEL) +
          bookingForm(SEL) +
          docForm(SEL) +
          reach +
          '<p class="fine left">Nothing is booked, paid or notarized by this step. Online notarial sessions are not currently available.</p>' +
          (SEL.error ? '<p class="err-box" role="alert" id="step-err" tabindex="-1">' + esc(SEL.error) + "</p>" : "");
        bar = '<button type="button" class="btn outline" data-go="market" data-forget>Browse other notaries</button><button type="button" class="btn big" data-request' + (SEL.busy || !detailsReady(SEL) || !bookingReady(SEL) || !on ? " disabled" : "") + ">" + (SEL.busy ? "Sending…" : requestWord(SEL)) + "</button>";
      }
    } else if (SEL.step === "interest") {
      at = 3; head = "Register your interest"; sub = "Online notarial sessions are not open yet. Choose to be told by email when you can book with " + name + ".";
      body = '<h3 id="step-h" tabindex="-1">' + CI.mail + "Register your interest</h3>" +
        '<dl class="summary"><div><dt>Notary</dt><dd>' + name + (l.kind === "office" ? "" : ", " + esc(l.firm)) + "<br>" + esc(l.city + ", " + l.province) + "</dd></div>" +
          "<div><dt>Your name</dt><dd>" + esc(ME.name) + "</dd></div><div><dt>Your email</dt><dd>" + esc(ME.email) + "</dd></div>" +
          "<div><dt>Identity verified in LAGDA</dt><dd>" + (SEL.outcome === "yes" ? "Yes" : SEL.outcome === "no" ? "No" : "Not offered") + "</dd></div></dl>" +
        '<p class="fine left">Your name and email come from your LAGDA account. To change them, update your profile in LAGDA.</p>' +
        '<label class="idv-agree"><input type="checkbox" id="int-agree"' + (SEL.agree ? " checked" : "") + "><span>LAGDA may email me about eNotary.</span></label>" +
        (SEL.error ? '<p class="err-box" role="alert" id="step-err" tabindex="-1">' + esc(SEL.error) + "</p>" : "");
      bar = '<button type="button" class="btn outline" data-go="market" data-forget>Browse other notaries</button><button type="button" class="btn big" data-register' + (SEL.agree && !SEL.busy ? "" : " disabled") + ">" + (SEL.busy ? "Saving…" : "Register my interest") + "</button>";
    } else {
      at = 2; head = "Verify your identity"; sub = "A notary must be sure who you are before meeting you. You verify your identity once, in LAGDA.";
      var p = SEL.idv, err = SEL.error ? '<p class="err-box" role="alert" id="step-err" tabindex="-1">' + esc(SEL.error) + "</p>" : "", wait = function (text) { return '<p class="ho-status" role="status"><i class="spin" aria-hidden="true"></i><span>' + text + "</span></p>"; };
      if (p === "loading") body = '<h3 id="step-h" tabindex="-1">' + PI.shield + "Verify your identity</h3>" + wait("Checking your account…");
      else if (p === "verified") {
        body = '<h3 id="step-h" tabindex="-1">' + PI.shield + 'Identity verified</h3><div class="idv-res ok" role="status">' + CI.check + "<div><b>Identity verified</b><p>Your identity was verified in LAGDA, so you do not need to do it again.</p></div></div>" +
          (SEL.verifiedName ? '<dl class="summary"><div><dt>Name</dt><dd>' + esc(SEL.verifiedName) + "</dd></div><div><dt>Verified by</dt><dd>LAGDA</dd></div></dl>" : "");
        bar = '<button type="button" class="btn outline" data-go="market" data-forget>Browse other notaries</button><button type="button" class="btn big" data-step="interest">Continue</button>';
      } else if (p === "consent") {
        body = '<h3 id="step-h" tabindex="-1">' + PI.shield + "Verify your identity</h3>" +
          '<p class="lead">This takes about two minutes. You photograph a government ID and take a short selfie on the page of LAGDA\'s identity verification partner.</p>' +
          '<dl class="summary"><div><dt>What is collected</dt><dd>An image of your ID, a selfie, and the result of the check.</dd></div><div><dt>Why</dt><dd>So that a notary meets the person the ID belongs to, and nobody can ask for a notarization in your name.</dd></div>' +
            "<div><dt>Where it happens</dt><dd>" + (touchDevice() ? "On the partner's page, in this tab. You come back to LAGDA when you finish." : "On the partner's page, in a new tab. This page waits and continues by itself.") + "</dd></div><div><dt>Where it is kept</dt><dd>On your LAGDA account. You verify once.</dd></div></dl>" +
          '<label class="idv-agree"><input type="checkbox" id="idv-agree"' + (SEL.agree ? " checked" : "") + "><span>I agree to the use of my ID and selfie to verify my identity for my LAGDA account.</span></label>" + err;
        bar = '<button type="button" class="btn outline" data-go="market" data-forget>Browse other notaries</button><button type="button" class="btn big" data-idv-start' + (SEL.agree ? "" : " disabled") + ">" + CI.out + "Verify my identity</button>";
      } else if (p === "opening") body = '<h3 id="step-h" tabindex="-1">' + PI.shield + "Verify your identity</h3>" + wait("Opening the identity check…");
      else if (p === "tab" || p === "waiting") {
        body = '<h3 id="step-h" tabindex="-1">' + PI.shield + "Finish the check" + (p === "tab" ? " in the new tab" : "") + "</h3>" +
          '<p class="lead">' + (p === "tab" ? "The identity check is open in a new tab. Follow the steps there. This page continues by itself when the result arrives." : "Your result is on its way. This page continues by itself when it arrives.") + "</p>" + wait("Waiting for the result…") + err +
          '<p class="fine left">If you finished on your phone, the result still arrives here.</p>';
        bar = '<button type="button" class="btn outline" data-idv-ask>Check again now</button>';
      } else if (p === "review") {
        body = '<h3 id="step-h" tabindex="-1">' + PI.shield + 'Your check is being reviewed</h3><div class="idv-res note" role="status"><span aria-hidden="true">i</span><div><b>Being reviewed</b><p>It is still being reviewed. Nothing more is needed from you right now. You can register your interest meanwhile.</p></div></div>' + err;
        bar = '<button type="button" class="btn outline" data-idv-ask>Check again now</button><button type="button" class="btn big" data-step="interest" data-outcome="no">Register my interest now</button>';
      } else if (p === "not-received") {
        body = '<h3 id="step-h" tabindex="-1">' + PI.shield + 'No result yet</h3><div class="idv-res note" role="status"><span aria-hidden="true">i</span><div><b>Nothing has arrived yet</b><p>If you finished the check, wait a moment and check again. If you did not, you can start it again.</p></div></div>' + err;
        bar = '<button type="button" class="btn outline" data-idv-retry>Start again</button><button type="button" class="btn big" data-idv-ask>Check again</button>';
      } else if (p === "declined") {
        body = '<h3 id="step-h" tabindex="-1">' + PI.shield + 'We could not verify your identity</h3><div class="idv-res bad" role="alert"><span aria-hidden="true">×</span><div><b>We could not verify your identity</b><p>This usually has a simple cause:</p><ul><li>the image of the ID was blurred, or had glare on it;</li><li>your face was not clearly visible in the selfie.</li></ul></div></div>' + err;
        bar = '<button type="button" class="btn outline" data-step="interest" data-outcome="no">Register without verifying</button><button type="button" class="btn big" data-idv-retry>Try again</button>';
      } else if (p === "unavailable") {
        body = '<h3 id="step-h" tabindex="-1">' + PI.shield + 'Identity verification is not available right now</h3><div class="idv-res note" role="status"><span aria-hidden="true">i</span><div><b>Not available right now</b><p>The identity check cannot be started at the moment. You can still register your interest, and verify your identity later in LAGDA.</p></div></div>';
        bar = '<button type="button" class="btn outline" data-idv-retry>Try again</button><button type="button" class="btn big" data-step="interest" data-outcome="no">Register my interest</button>';
      } else if (p === "ended") {
        body = '<h3 id="step-h" tabindex="-1">' + PI.shield + 'Sign in again</h3><div class="idv-res note" role="status"><span aria-hidden="true">i</span><div><b>Your LAGDA session has ended</b><p>Sign in again, and your choice of notary will be waiting for you.</p></div></div>';
        bar = '<a class="btn big" href="' + signInUrl(SEL && SEL.lawyer && SEL.lawyer.id) + '" data-signin>Sign in to LAGDA</a>';
      } else {
        body = '<h3 id="step-h" tabindex="-1">' + PI.shield + "Verify your identity</h3>" + err;
        bar = '<button type="button" class="btn big" data-idv-reload>Try again</button>';
      }
    }
    var state = SEL.step === "done" ? ["in", "Interest registered"] : SEL.step === "interest" ? ["wait", INV ? "Not requested yet" : "Interest not saved yet"] : ["wait", "Selected"];
    view.innerHTML = flowTop(head, sub, at) + '<div class="wrap flow"><div class="flow-grid">' + lawyerCard(l, state[0], state[1]) +
      '<section class="flow-card idv" aria-labelledby="step-h">' + body + (bar ? '<div class="actions bar">' + bar + "</div>" : "") + "</section></div></div>";
    barHeight();
    if (SEL.idv === "tab" || SEL.idv === "waiting") startPoll(FAST); else if (SEL.idv === "review") startPoll(SLOW);
  }
  function landed() { var h = document.getElementById("step-err") || document.getElementById("flow-h"); if (h) h.focus({ preventScroll: true }); }
  function redraw(move) { if (NOW !== "flow" || !SEL) return; flow(); if (move) { window.scrollTo(0, 0); landed(); } }

  /** Starts (or resumes) a choice of notary. Not signed in: sign in first, and the choice waits. */
  function choose(id) {
    var l = byId(id); if (!l) return;
    store(PENDING, { id: id, at: Date.now() });
    if (!ME) { location.assign(signInUrl(id)); return; }
    SEL = { lawyer: l, step: done().indexOf(id) >= 0 ? "done" : "identity", idv: "loading", outcome: "", agree: false, error: "", busy: false };
    closeProfile(); go("flow");
    if (SEL.step === "identity") readIdentity();
    // Interest registered before, but LAGDA now takes requests to notaries: the person can ask this notary now.
    else probeRequests().then(function (inv) { if (inv && SEL && SEL.step === "done") { SEL.step = "identity"; readIdentity(); } });
  }
  /** "Browse other notaries": the choice is let go, here and in the tab, so it does not come back on a reload. The identity check is the account's and is kept. */
  function forget() { stopPoll(); SEL = null; store(PENDING, null); }
  function readIdentity() {
    var sel = SEL; sel.idv = "loading"; sel.error = ""; redraw(false);
    api("GET", "/me/identity").then(function (r) {
      if (SEL !== sel) return;
      if (r.status === 404 || (r.ok && r.data && r.data.available === false)) { sel.outcome = "not offered"; sel.step = "interest"; redraw(true); return; } // not offered here: no step
      if (r.status === 401) { ME = null; sel.idv = "ended"; redraw(true); return; }
      if (!r.ok || !r.data) { sel.idv = "error"; sel.error = plainError(r); redraw(true); return; }
      var waiting = stored(CHECK);
      if (r.data.status === "verified") { sel.outcome = "yes"; sel.verifiedName = r.data.verifiedName || ""; sel.idv = "verified"; store(CHECK, null); }
      else if (r.data.pendingReview) sel.idv = "review";
      else if (waiting && Date.now() - waiting.at < WAIT) { sel.idv = "waiting"; pollUntil = waiting.at + WAIT; } // back from the partner's page in this tab
      else sel.idv = "consent";
      redraw(true);
    });
  }
  function touchDevice() {
    try { if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return true; return typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches; } catch (err) { return false; }
  }
  function webAddress(url) { try { var p = new URL(url).protocol; return p === "https:" || p === "http:"; } catch (err) { return false; } }
  /** In the click itself: the new tab is opened blank BEFORE anything is awaited, as the web app does, or browsers block it. */
  function startCheck() {
    var sel = SEL, tab = null;
    if (!touchDevice()) { try { tab = window.open("", "_blank"); } catch (err) { tab = null; } if (tab) { try { tab.opener = null; } catch (err) { /* already cut */ } } }
    sel.idv = "opening"; sel.error = ""; redraw(false);
    busyShow("Opening the identity check…", "It opens in a new tab. Come back here when it is done.");
    api("POST", "/me/identity/session", { consent: true }).then(function (r) {
      var shut = function () { if (tab) { try { tab.close(); } catch (err) { /* gone */ } } };
      busyHide();
      if (SEL !== sel) { shut(); return; }
      if (!r.ok || !r.data || !webAddress(r.data.url)) {
        shut();
        if (r.status === 409 && r.code === "identity_check_unavailable") sel.idv = "unavailable";
        else if (r.status === 401) { ME = null; sel.idv = "ended"; }
        else if (r.status === 404) { sel.outcome = "not offered"; sel.step = "interest"; }
        else { sel.idv = "consent"; sel.error = r.ok ? "The identity check could not be opened. Please try again." : plainError(r); }
        redraw(true); return;
      }
      store(CHECK, { at: Date.now() }); pollUntil = Date.now() + WAIT;
      if (tab) { try { tab.location.replace(r.data.url); } catch (err) { location.assign(r.data.url); return; } sel.idv = "tab"; redraw(true); }
      else location.assign(r.data.url); // a phone, or a browser that would not open a tab: this tab goes, and comes back
    });
  }
  function ask(pressed) {
    var sel = SEL; if (!sel || sel.step !== "identity" || asking) return;
    asking = true;
    if (pressed) busyShow("Checking your identity result…", "This takes a moment.");
    api("POST", "/me/identity/session/refresh").then(function (r) {
      asking = false; if (pressed) busyHide();
      if (SEL !== sel || sel.step !== "identity") return;
      var was = sel.idv;
      if (r.status === 401) { ME = null; sel.idv = "ended"; store(CHECK, null); }
      else if (r.status === 404) { sel.outcome = "not offered"; sel.step = "interest"; store(CHECK, null); }
      else if (!r.ok || !r.data) { sel.error = r.status === 429 ? "Too many tries in a short time. This page tries again by itself." : plainError(r); }
      else if (r.data.status === "verified") { sel.outcome = "yes"; sel.verifiedName = r.data.verifiedName || ""; sel.idv = "verified"; sel.error = ""; store(CHECK, null); }
      else if (r.data.lastOutcome === "declined") { sel.idv = "declined"; sel.error = ""; store(CHECK, null); }
      else if (r.data.pendingReview) { sel.idv = "review"; sel.error = ""; }
      else { sel.error = ""; if (Date.now() > pollUntil && (sel.idv === "tab" || sel.idv === "waiting")) sel.idv = "not-received"; }
      if (sel.idv !== was || sel.step !== "identity" || r.status === 429 || (!r.ok && r.status !== 401)) redraw(sel.idv !== was || sel.step !== "identity");
    });
  }
  function startPoll(every) {
    if (poll && pollEvery === every) return;
    stopPoll(); pollEvery = every;
    poll = setInterval(function () { if (!document.hidden) ask(); }, every);
  }
  function stopPoll() { if (poll) clearInterval(poll); poll = null; pollEvery = 0; }
  // the tab that waited comes back to the front: ask at once
  document.addEventListener("visibilitychange", function () { if (!document.hidden && SEL && poll) ask(); });
  window.addEventListener("focus", function () { if (SEL && poll) ask(); });
  window.addEventListener("pageshow", function (e) { if (e.persisted && SEL && SEL.step === "identity" && ME) readIdentity(); });

  // What a client asks for, before the notary sees the request. The lists mirror the rules in LAGDA's backend
  // (packages/core/src/enotary/request-details.ts): the server checks them again, and refuses a kind that is not done remotely.
  var ACTS = [["acknowledgment", "Acknowledgment"], ["jurat", "Jurat (sworn statement)"], ["signature_witnessing", "Signature witnessing"], ["not_sure", "I am not sure: the notary decides"]];
  var KINDS = [
    ["affidavit", "Affidavit or sworn statement", "ok", ""], ["spa", "Special power of attorney", "ok", ""], ["authorization", "Authorization or consent letter", "ok", ""],
    ["contract", "Contract or agreement", "ok", ""], ["certification", "Certification or declaration", "ok", ""],
    ["deed_of_sale", "Deed of sale", "warn", "A deed to be registered with the Registry of Deeds or another office may need an original with a handwritten signature. Ask that office before you pay."],
    ["deed_other", "Other deed (donation, partition, mortgage)", "warn", "A deed to be registered with the Registry of Deeds or another office may need an original with a handwritten signature. Ask that office before you pay."],
    ["other", "Another kind of document", "warn", "The notary decides whether they can notarize it. They may decline it."],
    ["will", "Will or testament", "blocked", "A will is not notarized remotely. The witnesses must be together with the person making it."],
    ["public_record_copy", "Certified copy of a public record (PSA, court or government record)", "blocked", "Only the office that keeps a public record can certify a copy of it."],
  ];
  function kindOf(id) { for (var i = 0; i < KINDS.length; i++) if (KINDS[i][0] === id) return KINDS[i]; return null; }
  function details(sel) { return sel.details || (sel.details = { act: "", kind: "", city: "", province: "", usedAbroad: false }); }
  function detailsReady(sel) { var d = details(sel); return !!(d.act && d.kind && kindOf(d.kind) && kindOf(d.kind)[2] !== "blocked" && d.city.trim() && d.province.trim()); }
  /** The "what do you need" form: the act, the kind of document, where the client will be. */
  function detailsForm(sel) {
    var d = details(sel), k = kindOf(d.kind);
    var acts = '<option value="">Choose…</option>' + ACTS.map(function (a) { return '<option value="' + a[0] + '"' + (d.act === a[0] ? " selected" : "") + ">" + esc(a[1]) + "</option>"; }).join("");
    var kinds = '<option value="">Choose…</option>' + KINDS.map(function (x) { return '<option value="' + x[0] + '"' + (d.kind === x[0] ? " selected" : "") + (x[2] === "blocked" ? " disabled" : "") + ">" + esc(x[1]) + (x[2] === "blocked" ? " (not notarized remotely)" : "") + "</option>"; }).join("");
    return '<fieldset class="req-details"><legend><b>What do you need?</b></legend>' +
      '<div class="field"><label for="rd-act">What do you want the notary to do?</label><select id="rd-act">' + acts + "</select></div>" +
      '<div class="field"><label for="rd-kind">What kind of document is it?</label><select id="rd-kind">' + kinds + "</select></div>" +
      (k && k[2] === "warn" ? '<p class="fine left" role="note" id="rd-note"><b>Please note.</b> ' + esc(k[3]) + "</p>" : "") +
      '<p class="fine left" id="rd-blocked" role="note" hidden>Wills and certified copies of public records cannot be notarized remotely.</p>' +
      '<div class="req-where"><b>Where will you be during the call?</b>' +
        '<label class="idv-agree"><input type="radio" name="rd-where" id="rd-ph" checked><span>In the Philippines</span></label>' +
        '<div class="two"><div class="field place-field"><label for="rd-city">City or municipality</label><input id="rd-city" type="text" maxlength="80" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="rd-city-list" placeholder="Start typing, e.g. Naga" value="' + esc(d.city) + '"></div>' +
        '<div class="field place-field"><label for="rd-province">Province</label><input id="rd-province" type="text" maxlength="80" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="rd-province-list" placeholder="Filled in from the city" value="' + esc(d.province) + '"></div></div>' +
        '<p class="fine left" id="rd-place-note" role="status">' + (d.provinceAuto ? "The province was filled in from the city you chose. Change it if it is wrong." : "Choose your city or municipality from the list: the province is filled in for you.") + "</p></div>" +
      '<label class="idv-agree req-abroad"><input type="checkbox" id="rd-abroad-use" aria-describedby="rd-abroad-help"' + (d.usedAbroad ? " checked" : "") + '><span><b>The document will be used outside the Philippines</b> <span class="fine">(optional)</span>' +
        '<small id="rd-abroad-help">Tick this only if the notarized document will be given to an office, embassy, school, bank or employer abroad. Leave it unticked if it stays in the Philippines. It does not change the notarization or the fee: the notary sees it with your request, and LAGDA reminds you of the extra step a document for use abroad may need.</small></span></label>' +
      (d.usedAbroad ? '<p class="fine left" role="note"><b>Please note.</b> A document for use abroad usually needs an apostille from the Department of Foreign Affairs (DFA) after it is notarized. Some countries ask for more. Ask the office that will receive it what it needs before you book.</p>' : "") +
      "</fieldset>";
  }

  // ── when: "Right now" (the notary has 15 minutes to answer) or "Book a time" (a 30-minute slot within office hours) ──
  // The server keeps the same rules: it refuses "now" while the notary is in a session, and a time that is not a free slot.
  var SLOT_DAY = new Intl.DateTimeFormat("en-US", { timeZone: OFFICE_HOURS.timeZone, weekday: "short", month: "short", day: "numeric" });
  var SLOT_LONG = new Intl.DateTimeFormat("en-US", { timeZone: OFFICE_HOURS.timeZone, weekday: "long", month: "long", day: "numeric" });
  var SLOT_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: OFFICE_HOURS.timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  function booking(sel) { return sel.booking || (sel.booking = busy(sel.lawyer) ? { kind: "scheduled", at: null, day: "" } : { kind: "now", at: null, day: "" }); }
  function bookingReady(sel) { var b = booking(sel); return b.kind === "now" ? !busy(sel.lawyer) : !!b.at; }
  function requestWord(sel) { return booking(sel).kind === "now" ? "Request this notary now" : "Book this time"; }
  /** The free and booked slots of the next 14 days, grouped by day: asked once per choice of notary. */
  function readSlots(sel) {
    if (sel.slotsAsked) return;
    sel.slotsAsked = true;
    api("GET", "/me/enotary/listings/" + encodeURIComponent(sel.lawyer.id) + "/slots").then(function (r) {
      var days = [], byKey = {};
      if (r.ok && r.data && Array.isArray(r.data.slots)) {
        r.data.slots.forEach(function (x) {
          var at = Date.parse(x.at); if (!at) return;
          var key = SLOT_KEY.format(at);
          if (!byKey[key]) { byKey[key] = { key: key, label: SLOT_DAY.format(at), slots: [] }; days.push(byKey[key]); }
          byKey[key].slots.push({ at: at, iso: new Date(at).toISOString(), taken: !!x.taken });
        });
      }
      sel.slots = r.ok ? days : null;
      var b = booking(sel);
      if (!b.day && days.length) { var first = days.filter(function (d) { return d.slots.some(function (x) { return !x.taken; }); })[0]; b.day = (first || days[0]).key; }
      if (SEL === sel) redraw(false);
    });
  }
  function bookingForm(sel) {
    var b = booking(sel), l = sel.lawyer, isBusy = busy(l);
    var nowNote = isBusy ? '<em class="idchip">In a session</em> This notary is in a session right now, so a request for right now cannot be sent.' : "The notary has 15 minutes to answer. If they do not, the request ends and you can book a time instead.";
    var html = '<fieldset class="req-booking"><legend><b>When do you need the notary?</b></legend>' +
      '<label class="idv-agree"' + (isBusy ? ' aria-disabled="true"' : "") + '><input type="radio" name="rb-kind" id="rb-now"' + (b.kind === "now" ? " checked" : "") + (isBusy ? " disabled" : "") + "><span><b>Right now</b><br>" + nowNote + "</span></label>" +
      '<label class="idv-agree"><input type="radio" name="rb-kind" id="rb-later"' + (b.kind === "scheduled" ? " checked" : "") + "><span><b>Book a time</b><br>Choose a 30-minute time within office hours, " + keepTogether(OFFICE_HOURS.text) + ", up to 14 days ahead.</span></label>";
    if (b.kind === "scheduled") {
      readSlots(sel);
      if (sel.slots === undefined) html += '<p class="ho-status" role="status"><i class="spin" aria-hidden="true"></i><span>Finding the free times…</span></p>';
      else if (sel.slots === null || !sel.slots.length) html += '<p class="fine left" role="status">' + (sel.slots === null ? "The free times could not be read. Check your connection, then choose Book a time again." : "There are no free times in the next 14 days.") + "</p>";
      else {
        // Two plain lists, the date then the time: a booked time is listed but cannot be chosen.
        var day = sel.slots.filter(function (d) { return d.key === b.day; })[0] || sel.slots[0];
        html += '<div class="two slot-pickers"><div class="field"><label for="rb-day">Date</label><select id="rb-day">' + sel.slots.map(function (d) {
          var free = d.slots.filter(function (x) { return !x.taken; }).length;
          return '<option value="' + esc(d.key) + '"' + (d.key === day.key ? " selected" : "") + (free ? "" : " disabled") + ">" + esc(SLOT_LONG.format(d.slots[0].at)) + (free ? "" : " (fully booked)") + "</option>";
        }).join("") + "</select></div>" +
          '<div class="field"><label for="rb-time">Time (30 minutes, Philippine time)</label><select id="rb-time"><option value="">Choose a time</option>' + day.slots.map(function (x) {
            return '<option value="' + esc(x.iso) + '"' + (b.at === x.iso ? " selected" : "") + (x.taken ? " disabled" : "") + ">" + esc(clockAt(x.at)) + " to " + esc(clockAt(x.at + 30 * 60000)) + (x.taken ? " (booked)" : "") + "</option>";
          }).join("") + "</select></div></div>";
        if (b.at) { var at = Date.parse(b.at); html += '<p class="slot-pick" role="status"><b>Your booking:</b> ' + esc(SLOT_LONG.format(at)) + ', <span class="nw">' + esc(clockAt(at)) + "</span> to <span class=\"nw\">" + esc(clockAt(at + 30 * 60000)) + "</span> (Philippine time). The notary accepts or declines it; if they do not answer by then, it ends.</p>"; }
      }
    }
    return html + "</fieldset>";
  }

  // ── the processing panel: while LAGDA works on an action, the page shows it and takes no other press ──
  var WORKING = null;
  /** Shows (or updates) the panel: what is happening, and what happens next. */
  function busyShow(message, detail) {
    if (!WORKING) {
      // A modal <dialog>: the browser puts it in the top layer, over the whole screen, whatever the page's own layout.
      var el = document.createElement("dialog");
      el.className = "dir-busy"; el.setAttribute("role", "alertdialog"); el.setAttribute("aria-busy", "true");
      el.addEventListener("cancel", function (e) { e.preventDefault(); }); // Escape does not close it: the work goes on
      el.setAttribute("aria-labelledby", "dir-busy-msg"); el.setAttribute("aria-describedby", "dir-busy-detail");
      el.innerHTML = '<div class="db-card" tabindex="-1">' +
        '<div class="db-lockup" role="img" aria-label="LAGDA eNotary"><img src="/brand/LagdaLogoHorizontalCropped.png" alt=""><i aria-hidden="true"></i><b aria-hidden="true">eNotary</b><em aria-hidden="true"></em></div>' +
        '<div class="db-mark" aria-hidden="true"><span class="db-ring"></span><span class="db-logo"><img src="/brand/LagdaLogoIconFullColorSquare.png" alt=""><span class="db-scan"></span></span><span class="db-diamond"></span></div>' +
        '<p class="db-msg" id="dir-busy-msg"></p><p class="db-detail" id="dir-busy-detail"></p><div class="db-bar" aria-hidden="true"><span></span></div></div>';
      document.body.appendChild(el); document.body.classList.add("dir-busy-open");
      if (typeof el.showModal === "function") el.showModal(); else el.setAttribute("open", "");
      WORKING = { el: el, back: document.activeElement };
      el.querySelector(".db-card").focus();
    }
    WORKING.el.querySelector(".db-msg").textContent = message;
    WORKING.el.querySelector(".db-detail").textContent = detail || "";
  }
  function busyHide() {
    if (!WORKING) return;
    if (typeof WORKING.el.close === "function" && WORKING.el.open) WORKING.el.close();
    WORKING.el.remove(); document.body.classList.remove("dir-busy-open");
    WORKING = null;
  }
  // Nothing on the page answers a key while the panel is up.
  document.addEventListener("keydown", function (e) { if (WORKING) { e.preventDefault(); e.stopPropagation(); } }, true);

  // ── where the client will be: a city or municipality from the official list, and its province filled in ──
  var PLACE_LIST = (window.PH_PLACES || []).map(function (r) { return { name: r[0], province: r[1], alias: r[2] || "" }; });
  var PROVINCES = PLACE_LIST.reduce(function (all, p) { if (all.indexOf(p.province) < 0) all.push(p.province); return all; }, []).sort();
  // Shown before anything is typed: the places most people ask from.
  var STARTERS = [["Manila", "Metro Manila"], ["Quezon City", "Metro Manila"], ["Makati City", "Metro Manila"], ["Taguig City", "Metro Manila"], ["Pasig City", "Metro Manila"],
    ["Cebu City", "Cebu"], ["Davao City", "Davao del Sur"], ["Naga City", "Camarines Sur"], ["Iloilo City", "Iloilo"], ["Baguio City", "Benguet"],
    ["Cagayan de Oro City", "Misamis Oriental"], ["Zamboanga City", "Zamboanga del Sur"]];
  function fold(v) { return String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); }
  PLACE_LIST.forEach(function (p) { p.fkey = fold(p.name + " " + p.alias); });
  function placeMatches(q) {
    q = fold(q);
    if (!q) return STARTERS.map(function (s) { return PLACE_LIST.filter(function (p) { return p.name === s[0] && p.province === s[1]; })[0]; }).filter(Boolean);
    var starts = [], words = [], inside = [];
    PLACE_LIST.forEach(function (p) {
      if (p.fkey.indexOf(q) === 0) starts.push(p);
      else if (p.fkey.indexOf(" " + q) > 0) words.push(p);
      else if (p.fkey.indexOf(q) > 0 || fold(p.province).indexOf(q) === 0) inside.push(p);
    });
    return starts.concat(words, inside).slice(0, 40);
  }
  function provinceMatches(q) { q = fold(q); return PROVINCES.filter(function (p) { return !q || fold(p).indexOf(q) === 0 || fold(p).indexOf(" " + q) > 0; }).slice(0, 40); }
  var COMBO = null; // the list open under a field: { input, list, items, active }
  function closeCombo() {
    if (!COMBO) return;
    COMBO.list.remove(); COMBO.input.setAttribute("aria-expanded", "false"); COMBO.input.removeAttribute("aria-activedescendant"); COMBO = null;
  }
  function openCombo(input) {
    var isCity = input.id === "rd-city", items = isCity ? placeMatches(input.value) : provinceMatches(input.value);
    if (!COMBO || COMBO.input !== input) {
      closeCombo();
      var list = document.createElement("ul");
      list.id = input.id + "-list"; list.className = "place-list"; list.setAttribute("role", "listbox");
      list.setAttribute("aria-label", isCity ? "Cities and municipalities" : "Provinces");
      input.parentNode.appendChild(list);
      COMBO = { input: input, list: list, items: [], active: -1 };
    }
    COMBO.items = items; COMBO.active = -1;
    COMBO.list.innerHTML = items.length
      ? items.map(function (it, i) {
        return '<li role="option" id="' + input.id + "-opt-" + i + '" data-place="' + i + '" aria-selected="false">' +
          (isCity ? "<b>" + esc(it.name) + '</b><span class="pl-prov">' + esc(it.province) + "</span>" : "<b>" + esc(it) + "</b>") + "</li>";
      }).join("") + (isCity && !fold(input.value) ? '<li class="pl-hint" aria-hidden="true">Type to search all ' + PLACE_LIST.length.toLocaleString("en-US") + " cities and municipalities</li>" : "")
      : '<li class="pl-hint" aria-hidden="true">' + (isCity ? "No city or municipality by that name. Check the spelling, or keep what you typed." : "No province by that name.") + "</li>";
    input.setAttribute("aria-expanded", "true");
  }
  function moveCombo(step) {
    if (!COMBO || !COMBO.items.length) return;
    COMBO.active = (COMBO.active + step + COMBO.items.length) % COMBO.items.length;
    [].forEach.call(COMBO.list.querySelectorAll("[role=option]"), function (li, i) { li.setAttribute("aria-selected", i === COMBO.active ? "true" : "false"); });
    var on = document.getElementById(COMBO.input.id + "-opt-" + COMBO.active);
    if (on) { COMBO.input.setAttribute("aria-activedescendant", on.id); on.scrollIntoView({ block: "nearest" }); }
  }
  function choosePlace(i) {
    if (!COMBO || !SEL) return;
    var it = COMBO.items[i]; if (it === undefined) return;
    var d = details(SEL), city = document.getElementById("rd-city"), prov = document.getElementById("rd-province"), note = document.getElementById("rd-place-note");
    if (COMBO.input.id === "rd-city") {
      d.city = it.name; d.province = it.province; d.provinceAuto = true;
      if (city) city.value = it.name;
      if (prov) prov.value = it.province;
      if (note) note.textContent = "The province was filled in from the city you chose. Change it if it is wrong.";
    } else {
      d.province = it; d.provinceAuto = false;
      if (prov) prov.value = it;
    }
    var input = COMBO.input; closeCombo(); syncRequestButton(); input.focus();
  }
  document.addEventListener("focusin", function (e) { if (SEL && (e.target.id === "rd-city" || e.target.id === "rd-province")) openCombo(e.target); });
  document.addEventListener("click", function (e) { if (SEL && (e.target.id === "rd-city" || e.target.id === "rd-province") && !COMBO) openCombo(e.target); });
  document.addEventListener("focusout", function (e) {
    if (COMBO && e.target === COMBO.input) setTimeout(function () { if (COMBO && document.activeElement !== COMBO.input) closeCombo(); }, 150);
  });
  document.addEventListener("mousedown", function (e) {
    var li = e.target.closest && e.target.closest(".place-list [data-place]");
    if (li) { e.preventDefault(); choosePlace(Number(li.getAttribute("data-place"))); }
    else if (COMBO && !(e.target.closest && e.target.closest(".place-field"))) closeCombo();
  });
  document.addEventListener("keydown", function (e) {
    if (!COMBO || e.target !== COMBO.input) return;
    if (e.key === "ArrowDown") { e.preventDefault(); moveCombo(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveCombo(-1); }
    else if (e.key === "Enter" && COMBO.active >= 0) { e.preventDefault(); choosePlace(COMBO.active); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeCombo(); }
    else if (e.key === "Tab") closeCombo();
  }, true);

  // ── 131. the document to be notarized, attached to the request so the notary can read it before the call ──
  var DOC_MAX = 20 * 1024 * 1024;
  function fileSize(n) { return n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  // The document section's pictures: a stack of pages with a PDF badge and a small seal (soft depth, no photo), and
  // three small icons for why it helps. Inline SVG, drawn in LAGDA's navy, maroon and gold.
  var DOC_ART = '<svg class="dd-art" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="ddPage" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9EFF7"/></linearGradient>' +
    '<linearGradient id="ddBadge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A3264B"/><stop offset="1" stop-color="#7A1535"/></linearGradient>' +
    '<radialGradient id="ddSeal" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#F3D9A4"/><stop offset="1" stop-color="#B98A2E"/></radialGradient>' +
    '<filter id="ddShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#0B1F44" flood-opacity=".22"/></filter></defs>' +
    '<g filter="url(#ddShadow)">' +
      '<rect x="30" y="14" width="58" height="76" rx="6" fill="#DCE5F1" transform="rotate(8 59 52)"/>' +
      '<rect x="24" y="18" width="58" height="76" rx="6" fill="#EEF3F9" transform="rotate(-6 53 56)"/>' +
      '<path d="M28 16h40l16 16v62a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6V22a6 6 0 0 1 6-6z" fill="url(#ddPage)" stroke="#C7D4E5"/>' +
      '<path d="M68 16v12a4 4 0 0 0 4 4h12z" fill="#D5E0EE"/>' +
      '<rect x="31" y="40" width="36" height="4" rx="2" fill="#C2CFE0"/><rect x="31" y="50" width="44" height="4" rx="2" fill="#D3DDEA"/>' +
      '<rect x="31" y="60" width="40" height="4" rx="2" fill="#D3DDEA"/><rect x="31" y="70" width="28" height="4" rx="2" fill="#D3DDEA"/>' +
      '<rect x="14" y="74" width="40" height="20" rx="5" fill="url(#ddBadge)"/><text x="34" y="88.5" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="12" font-weight="700" fill="#fff" letter-spacing=".5">PDF</text>' +
      '<circle cx="86" cy="86" r="15" fill="url(#ddSeal)" stroke="#fff" stroke-width="3"/><path d="M79.5 86.5l4.5 4.5 8.5-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</g></svg>';
  var DOC_ICON = {
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  };
  function docForm(sel) {
    var f = sel.file;
    var why = '<ul class="dd-why">' +
      "<li>" + DOC_ICON.eye + "<span><b>Read before accepting.</b> The notary sees exactly what you need notarized.</span></li>" +
      "<li>" + DOC_ICON.clock + "<span><b>A shorter call.</b> Nothing to upload during the session.</span></li>" +
      "<li>" + DOC_ICON.lock + "<span><b>Private.</b> Only you and this notary can open it.</span></li></ul>";
    var body = f
      ? '<div class="dd-file" role="status"><span class="dd-file-icon">' + DOC_ICON.file + '<em>PDF</em></span>' +
          '<span class="dd-file-meta"><b>' + esc(f.name) + "</b><small>PDF · " + esc(fileSize(f.size)) + ' · ready to send with your request</small></span>' +
          '<span class="req-doc-acts"><button type="button" class="btn outline small" data-doc-view>View</button><button type="button" class="btn outline small" data-doc-remove>Remove</button></span></div>'
      : '<div class="dd-drop" data-doc-drop>' + DOC_ART +
          '<div class="dd-copy"><p class="dd-title" id="rf-doc-label">Upload the document <span>(PDF format only)</span></p>' +
          '<p class="dd-sub">Drag the file here, or</p>' +
          '<input id="rf-doc" class="req-doc-input" type="file" accept="application/pdf,.pdf" aria-labelledby="rf-doc-label" aria-describedby="rf-doc-help">' +
          '<label for="rf-doc" class="btn dd-btn">' + DOC_ICON.upload + "Choose a PDF file</label>" +
          '<p class="dd-limit">PDF only (.pdf) · up to 20 MB</p></div></div>';
    return '<fieldset class="req-doc"><legend><b>The document to be notarized</b> <span class="dd-pill">Optional</span></legend>' +
      '<div class="dd-card">' + body + why + "</div>" +
      (sel.fileError ? '<p class="err-box" role="alert">' + esc(sel.fileError) + "</p>" : "") +
      '<p class="fine left" id="rf-doc-help">Scanned papers and photos must first be saved as a PDF. You may also add the document later, on your request’s page or during the session.</p>' +
      "</fieldset>";
  }
  // Dropping a file on the document area chooses it, with the same checks as the button.
  document.addEventListener("dragover", function (e) { var z = e.target.closest && e.target.closest("[data-doc-drop]"); if (!z) return; e.preventDefault(); z.classList.add("is-over"); });
  document.addEventListener("dragleave", function (e) { var z = e.target.closest && e.target.closest("[data-doc-drop]"); if (z && !z.contains(e.relatedTarget)) z.classList.remove("is-over"); });
  document.addEventListener("drop", function (e) {
    var z = e.target.closest && e.target.closest("[data-doc-drop]"); if (!z || !SEL) return;
    e.preventDefault(); z.classList.remove("is-over");
    var picked = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (!picked) return;
    checkingFile(function () {
      SEL.fileError = fileProblem(picked); if (!SEL.fileError) SEL.file = picked;
      redraw(false); var fd = document.querySelector("[data-doc-view]") || document.getElementById("rf-doc"); if (fd) fd.focus();
    });
  });
  /** A file just chosen: the panel for a moment while it is checked, then `then` (1.2 seconds: long enough to read). */
  function checkingFile(then) {
    busyShow("Checking your document…", "Making sure it is a PDF of 20 MB or less.");
    setTimeout(function () { busyHide(); then(); }, 1200);
  }
  /** The page's own checks on a chosen file: "" when it may be attached, else why not. */
  function fileProblem(f) {
    if (!f) return "";
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") return "Only a PDF can be notarized here.";
    if (f.size > DOC_MAX) return "The file is larger than 20 MB.";
    if (f.size === 0) return "The file is empty.";
    return "";
  }
  // ── the attached PDF, viewed in a pop-up at the centre of the page, with "Change file" ──
  var VIEW = null;
  function closeDocView() {
    if (!VIEW) return;
    URL.revokeObjectURL(VIEW.url); VIEW.el.remove(); document.body.classList.remove("doc-view-open");
    var back = VIEW.back; VIEW = null;
    var b = document.querySelector("[data-doc-view]") || back; if (b && b.focus) b.focus();
  }
  function fillDocView() {
    var f = SEL && SEL.file; if (!VIEW || !f) return;
    URL.revokeObjectURL(VIEW.url); VIEW.url = URL.createObjectURL(f);
    VIEW.el.querySelector(".dv-name").textContent = f.name;
    VIEW.el.querySelector(".dv-size").textContent = "PDF · " + fileSize(f.size);
    VIEW.el.querySelector("iframe").src = VIEW.url;
    VIEW.el.querySelector(".dv-err").hidden = true;
  }
  function openDocView(from) {
    if (!SEL || !SEL.file) return;
    closeDocView();
    var el = document.createElement("div");
    el.className = "doc-view";
    el.innerHTML = '<div class="dv-panel" role="dialog" aria-modal="true" aria-labelledby="dv-title">' +
      '<div class="dv-head"><div class="dv-meta"><p class="dv-eyebrow" id="dv-title">The document to be notarized</p><p class="dv-name"></p><p class="dv-size"></p></div>' +
      '<button type="button" class="dv-x" data-dv-close aria-label="Close">&times;</button></div>' +
      '<div class="dv-body"><iframe title="The attached PDF"></iframe></div>' +
      '<p class="err-box dv-err" role="alert" hidden></p>' +
      '<div class="dv-foot"><button type="button" class="btn outline" data-dv-change>Change file</button><input id="rf-doc-change" type="file" accept="application/pdf,.pdf" class="dv-input" tabindex="-1" aria-hidden="true">' +
      '<button type="button" class="btn" data-dv-close>Done</button></div></div>';
    document.documentElement.appendChild(el); document.body.classList.add("doc-view-open");
    VIEW = { el: el, url: "", back: from };
    fillDocView();
    el.addEventListener("click", function (e) {
      if (e.target === el || e.target.closest("[data-dv-close]")) closeDocView();
      else if (e.target.closest("[data-dv-change]")) el.querySelector("#rf-doc-change").click();
    });
    el.querySelector("#rf-doc-change").addEventListener("change", function (e) {
      var picked = e.target.files && e.target.files[0]; e.target.value = "";
      if (!picked) return;
      checkingFile(function () {
        var why = fileProblem(picked), err = el.querySelector(".dv-err");
        if (why) { err.textContent = why; err.hidden = false; return; }
        SEL.file = picked; SEL.fileError = ""; fillDocView(); redraw(false);
      });
    });
    el.querySelector(".dv-x").focus();
  }

  /** Sends the attached file to a request just made. Never rejects: true when it was kept. */
  function sendDocument(id, file) {
    var csrf = cookie("lagda_csrf"), form = new FormData();
    form.append("file", file, file.name);
    var headers = { Accept: "application/json" }; if (csrf) headers["X-CSRF-Token"] = csrf;
    return fetch("/api/me/enotary/requests/" + encodeURIComponent(id) + "/document", { method: "POST", credentials: "include", headers: headers, body: form })
      .then(function (res) { return res.ok; }).catch(function () { return false; });
  }

  /** Sends the request, then the person goes to its page in the app, where the link and QR code are. */
  function request(withEmail) {
    var sel = SEL, l = sel && sel.lawyer; if (!sel || sel.busy) return;
    var email = withEmail === false ? "" : String(sel.email || "").trim();
    sel.busy = true; sel.error = ""; redraw(false);
    if (!detailsReady(sel)) { sel.busy = false; sel.error = "Say what you need, the kind of document and where you will be."; redraw(false); return; }
    var d = details(sel);
    var body = { directoryId: l.id, details: { actWanted: d.act, documentKind: d.kind, inPhilippines: true, city: d.city.trim(), province: d.province.trim(), usedAbroad: !!d.usedAbroad } };
    if (email) body.notaryEmail = email;
    var b = booking(sel);
    if (!bookingReady(sel)) { sel.busy = false; sel.error = b.kind === "now" ? "This notary is in a session right now. Book a time instead." : "Choose a time."; redraw(false); landed(); return; }
    body.booking = b.kind === "now" ? { kind: "now" } : { kind: "scheduled", at: b.at };
    // Offline: nothing is sent, even if the button was forced on (the server refuses a request to an offline notary too).
    if (!online(l)) { sel.busy = false; redraw(false); var note = document.getElementById("req-offline"); if (note) note.focus(); return; }
    busyShow("Sending your request to " + title(l) + "…", b.kind === "now" ? "The notary is told at once and has 15 minutes to answer." : "The notary is told and accepts or declines your booking.");
    api("POST", "/me/enotary/invitations", body).then(function (r) {
      if (SEL !== sel) { busyHide(); return; }
      var inv = r.ok && r.data ? r.data.invitation || r.data : null;
      if (inv && inv.id) {
        store(PENDING, null);
        if (!sel.file) { busyShow("Request sent. Opening it…", "Its page has the link and the QR code for the notary."); location.assign(requestPath(inv.id)); return; }
        // The request is made; the document follows it. If it could not be kept, the request's page says so and offers it again.
        busyShow("Attaching your document…", "Checking the file, then keeping it with your request for the notary to read.");
        sendDocument(inv.id, sel.file).then(function (kept) { busyShow(kept ? "Request sent. Opening it…" : "Request sent. Opening it…", kept ? "The notary can read your document before they accept." : "The document could not be attached: you can attach it on the request's page."); location.assign(requestPath(inv.id) + (kept ? "" : "?document=failed")); });
        return;
      }
      sel.busy = false; busyHide();
      if (r.status === 422 && r.code === "notary_email_not_allowed") { request(false); return; } // LAGDA already has a way to reach this notary
      if (r.status === 409 && r.code === "enotary_invitation_open") {
        // Already asked: go to that request (the answer may carry its id; otherwise find it in the list).
        var id = r.data && r.data.error && (r.data.error.invitationId || r.data.error.id);
        if (id) { location.assign(requestPath(id)); return; }
        INV = undefined;
        probeRequests().then(function () { var q = openRequestFor(l.id); if (q) location.assign(requestPath(q.id)); else { sel.error = "You already have an open request for this notary."; redraw(false); landed(); } });
        return;
      }
      if (r.status === 422 && (r.code === "abroad_coming_soon" || r.code === "document_blocked" || r.code === "request_details_invalid")) sel.error = (r.data && r.data.error && r.data.error.message) || "Check what you asked for.";
      else if (r.status === 409 && r.code === "enotary_request_rate_limit") sel.error = "You have made the most requests allowed in a day. Please try again tomorrow.";
      else if (r.status === 409 && r.code === "enotary_notary_offline") sel.error = (r.data && r.data.error && r.data.error.message) || "This notary is offline. Requests can be sent Monday to Friday, 8:00 AM to 5:00 PM (Philippine time)."; // the server's own office-hours check
      else if (r.status === 409 && r.code === "enotary_notary_busy") { BUSY[l.id] = { until: null }; sel.booking = { kind: "scheduled", at: null, day: "" }; sel.error = (r.data && r.data.error && r.data.error.message) || "This notary is in a session right now. Book a time instead, or try again shortly."; }
      else if (r.status === 409 && r.code === "enotary_slot_taken") { b.at = null; sel.slots = undefined; sel.slotsAsked = false; sel.error = (r.data && r.data.error && r.data.error.message) || "That time was just booked. Choose another time."; }
      else if (r.status === 422 && r.code === "enotary_booking_invalid") { b.at = null; sel.error = (r.data && r.data.error && r.data.error.message) || "Choose another time."; }
      else if (r.status === 409 && r.code === "enotary_invitation_limit") sel.error = "You already have 3 open requests. Cancel one, or wait for it to end, then try again.";
      else if (r.status === 403 && r.code === "client_identity_required") { INV = { list: INV ? INV.list : [], needsIdentity: true }; sel.error = ""; }
      else if (r.status === 404 && r.code === "enotary_notary_not_listed") sel.error = "That notary is not listed in the Notary Directory.";
      else if (r.status === 404) { INV = null; sel.error = ""; } // switched off meanwhile: the waitlist step
      else if (r.status === 401) { ME = null; sel.step = "identity"; sel.idv = "ended"; sel.error = ""; }
      else sel.error = plainError(r);
      redraw(false); landed();
    });
  }

  function register() {
    var sel = SEL, l = sel.lawyer; if (sel.busy || !sel.agree) return;
    sel.busy = true; sel.error = ""; redraw(false);
    var who = title(l), body = { kind: "waitlist", name: ME.name.slice(0, 120), email: ME.email, consent: true,
      topic: "Individual / Personal", // the waitlist needs who is asking: a person choosing a notary for themselves
      subject: ("eNotary interest: " + who).slice(0, 200),
      message: (who + ", " + (l.kind === "office" ? l.position || "Law office" : l.firm) + ", " + l.city + ". Identity verified in LAGDA: " + (sel.outcome === "yes" ? "yes" : sel.outcome === "no" ? "no" : "not offered")).slice(0, 4000) };
    busyShow("Saving your interest…", "LAGDA emails you when you can book with " + who + ".");
    api("POST", "/public/inquiries", body).then(function (r) {
      busyHide();
      if (SEL !== sel) return;
      sel.busy = false;
      if (r.ok) { var list = done(); if (list.indexOf(l.id) < 0) list.push(l.id); store(DONE, list); store(PENDING, null); sel.step = "done"; redraw(true); toast("Your interest is saved"); return; }
      sel.error = plainError(r); redraw(false); landed();
    });
  }

  // ── the page frame: the bar for a phone, the menu, the views ──
  function barHeight() { var bar = document.querySelector(".flow .bar"), h = bar && getComputedStyle(bar).position === "fixed" ? Math.ceil(bar.getBoundingClientRect().height) : 0; document.body.style.setProperty("--bar", h + "px"); }
  window.addEventListener("resize", barHeight);
  // One button at every width: a dropdown, or a sheet on a phone.
  var MENU = false, NOW = "market";
  function menuFill() {
    var row = function (attrs, icon, label, text, on) { return "<a " + attrs + (on ? ' aria-current="page"' : "") + ">" + icon + "<span><b>" + label + "</b><small>" + text + "</small></span></a>"; };
    document.getElementById("menu").innerHTML =
      row('href="#" data-go="market"', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.500"/><path d="m16 16 4.500 4.500"/></svg>', "Find a notary", "Notary Directory: browse lawyers and law offices", NOW === "market") +
      (SEL ? row('href="#" data-go="flow"', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>', "Your choice", esc(title(SEL.lawyer)), NOW === "flow") : "") +
      (ME ? row('href="/app/enotary/requests"', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>', "Your requests", "Notaries you have asked, and where each stands", false) +
        row('href="/app/enotary/apply"', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7v5c0 4.500 3.400 8 8 9 4.600-1 8-4.500 8-9V7z"/><path d="m9 12 2 2 4-4"/></svg>', "Become a notary", "Notaries public: apply to receive requests", false) : "") +
      '<span class="menu-rule" aria-hidden="true"></span>' +
      row('href="' + (ME ? "/app/dashboard" : "/") + '" class="back"', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6 4 12l6 6M4 12h16"/></svg>', "Back to LAGDA", ME ? "Return to your LAGDA workspace" : "Return to lagda.io", false);
  }
  function narrow() { return !!(window.matchMedia && window.matchMedia("(max-width: 640px)").matches); }
  function openMenu() {
    if (MENU) return;
    MENU = true; menuFill();
    var btn = document.getElementById("menu-btn"), panel = document.getElementById("menu");
    panel.hidden = false; btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-label", "Close the menu"); document.querySelector(".top").classList.add("menu-open");
    document.getElementById("menu-veil").hidden = false; if (narrow()) document.body.style.overflow = "hidden";
    (panel.querySelector('[aria-current="page"]') || panel.querySelector("a")).focus();
  }
  function closeMenu(refocus) {
    if (!MENU) return;
    MENU = false;
    var btn = document.getElementById("menu-btn");
    document.getElementById("menu").hidden = true; document.getElementById("menu-veil").hidden = true; btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "Menu"); document.querySelector(".top").classList.remove("menu-open");
    if (!document.getElementById("modal-root").firstElementChild) document.body.style.overflow = "";
    if (refocus) btn.focus();
  }
  document.getElementById("menu-btn").addEventListener("click", function () { if (MENU) closeMenu(true); else openMenu(); });
  document.addEventListener("click", function (e) { if (MENU && !e.target.closest("#menu, #menu-btn")) closeMenu(false); }, true);
  document.addEventListener("focusin", function (e) { if (MENU && !narrow() && !e.target.closest("#menu, #menu-btn")) closeMenu(false); });
  window.addEventListener("resize", function () { closeMenu(false); });

  function go(name) {
    closeMenu(false);
    NOW = name === "flow" && SEL ? "flow" : "market";
    document.body.classList.toggle("in-flow", NOW === "flow");
    if (NOW === "flow") flow(); else { stopPoll(); market(); barHeight(); }
    window.scrollTo(0, 0);
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-go],[data-open],[data-select],[data-close],[data-page],[data-clear],[data-step],[data-idv-start],[data-idv-ask],[data-idv-retry],[data-idv-reload],[data-register],[data-request],[data-doc-remove],[data-doc-view],#clear,#veil,[data-wait-hide],[data-wait-show],[data-sel-wrap]");
    if (!t) return;
    if (t.id === "veil") { if (e.target === t) closeProfile(); return; }
    if (t.hasAttribute("data-go")) { e.preventDefault(); if (t.hasAttribute("data-forget")) forget(); go(t.getAttribute("data-go")); }
    else if (t.hasAttribute("data-open")) profile(t.getAttribute("data-open"));
    else if (t.hasAttribute("data-page")) { if (t.getAttribute("aria-disabled") !== "true") turn(t.getAttribute("data-page")); }
    else if (t.hasAttribute("data-select")) choose(t.getAttribute("data-select"));
    else if (t.hasAttribute("data-close")) closeProfile();
    else if (t.hasAttribute("data-wait-hide")) waitShown(false);
    else if (t.hasAttribute("data-wait-show")) waitShown(true, true);
    else if (t.hasAttribute("data-sel-wrap")) { if (t.querySelector("[data-select]").disabled) waitShown(true, true); } // a press on the disabled button
    else if (t.hasAttribute("data-clear") || t.id === "clear") reset();
    else if (!SEL) return;
    else if (t.hasAttribute("data-step")) { if (t.hasAttribute("data-outcome")) SEL.outcome = t.getAttribute("data-outcome"); SEL.step = t.getAttribute("data-step"); SEL.error = ""; store(CHECK, null); redraw(true); }
    else if (t.hasAttribute("data-doc-view")) openDocView(t);
    else if (t.hasAttribute("data-doc-remove")) { SEL.file = null; SEL.fileError = ""; redraw(false); var fi = document.getElementById("rf-doc"); if (fi) fi.focus(); }
    else if (t.hasAttribute("data-idv-start")) { if (SEL.agree) startCheck(); }
    else if (t.hasAttribute("data-idv-ask")) ask(true);
    else if (t.hasAttribute("data-idv-retry")) { if (t.hasAttribute("data-back-to-identity")) { SEL.step = "identity"; INV = undefined; } SEL.idv = "consent"; SEL.error = ""; store(CHECK, null); redraw(true); }
    else if (t.hasAttribute("data-idv-reload")) readIdentity();
    else if (t.hasAttribute("data-register")) register();
    else if (t.hasAttribute("data-request")) request();
  });
  /** The request step: "Request this notary" can be pressed once the details are given, and only while the notary is online. */
  function syncRequestButton() {
    var b = document.querySelector("[data-request]"); if (!b || !SEL) return;
    var on = online(SEL.lawyer), note = document.getElementById("req-offline");
    if (note) note.hidden = on;
    if (!on && note && document.activeElement === b) note.focus(); // the focus does not vanish with the button
    b.disabled = !!SEL.busy || !detailsReady(SEL) || !bookingReady(SEL) || !on;
  }
  /** The offline note put away (a small "Why can't I select" chip takes its place) or brought back; brought back by a press on
      the disabled button or the chip, it lifts once to show where the answer is. */
  var WAIT_HIDDEN = false;
  function waitShown(show, nudge) {
    var w = document.getElementById("pf-wait"), chip = document.querySelector(".pf-wait-chip"); if (!w || !chip) return;
    WAIT_HIDDEN = !show; w.hidden = !show; chip.hidden = show;
    if (show && nudge) { w.classList.remove("is-nudged"); void w.offsetWidth; w.classList.add("is-nudged"); }
    (show ? w.querySelector(".pf-wait-x") : chip).focus();
  }
  /** The open profile: "Select this notary" only while the notary is online; offline, the note says why and when. */
  function syncProfile() {
    var b = document.querySelector(".pf [data-select]"), w = document.getElementById("pf-wait"), chip = document.querySelector(".pf-wait-chip"); if (!b) return;
    var l = byId(b.getAttribute("data-select")), on = online(l);
    // Drawn again each minute for the countdown, unless the visitor is on its close button.
    if (w && !on && !w.contains(document.activeElement)) w.innerHTML = waitNote(l);
    if (w) w.hidden = on || WAIT_HIDDEN;
    if (chip) chip.hidden = on || !WAIT_HIDDEN;
    if (!on && document.activeElement === b) document.querySelector(".pf .pf-x").focus();
    b.disabled = !on;
  }
  // The status, kept current: worked out again every minute, on the minute, so that it changes at the opening and the
  // closing time without a reload. Only a status that changed is drawn again.
  function refreshStatus() {
    return readAvailability().then(function () {
      [].forEach.call(document.querySelectorAll("[data-status]"), function (el) {
        var l = byId(el.getAttribute("data-status"));
        if (l && el.getAttribute("data-state") !== stateOf(l)) el.outerHTML = statusBadge(l);
      });
      syncProfile(); syncRequestButton();
    });
  }
  refreshStatus();
  (function tick() { setTimeout(function () { refreshStatus(); tick(); }, 60000 - Date.now() % 60000 + 250); })();
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refreshStatus(); });
  document.addEventListener("change", function (e) {
    var id = e.target.id;
    if (SEL && id === "rf-doc") {
      var picked = e.target.files && e.target.files[0];
      if (!picked) return;
      checkingFile(function () {
        SEL.fileError = fileProblem(picked);
        if (!SEL.fileError) SEL.file = picked;
        redraw(false); var fd = document.querySelector("[data-doc-remove]") || document.getElementById("rf-doc"); if (fd) fd.focus();
      });
      return;
    }
    if (SEL && id === "rb-day") { var bd = booking(SEL); bd.day = e.target.value; bd.at = null; SEL.error = ""; redraw(false); var dd = document.getElementById("rb-day"); if (dd) dd.focus(); return; }
    if (SEL && id === "rb-time") { var opt = e.target.selectedOptions && e.target.selectedOptions[0]; booking(SEL).at = opt && !opt.disabled ? e.target.value || null : null; SEL.error = ""; redraw(false); var tt = document.getElementById("rb-time"); if (tt) tt.focus(); return; }
    if (SEL && (id === "rb-now" || id === "rb-later")) { var bk = booking(SEL); bk.kind = id === "rb-now" ? "now" : "scheduled"; SEL.error = ""; redraw(false); var r0 = document.getElementById(id); if (r0) r0.focus(); return; }
    if (SEL && (id === "rd-act" || id === "rd-kind" || id === "rd-abroad-use")) {
      var dd = details(SEL);
      if (id === "rd-act") dd.act = e.target.value; else if (id === "rd-kind") dd.kind = e.target.value; else dd.usedAbroad = e.target.checked;
      SEL.error = ""; redraw(false); return;
    }
    if (id === "idv-agree" || id === "int-agree") { if (SEL) { SEL.agree = e.target.checked; var b = document.querySelector(id === "idv-agree" ? "[data-idv-start]" : "[data-register]"); if (b) b.disabled = !SEL.agree || SEL.busy; } return; }
    if (id === "f-location") { var at = PLACES.filter(function (p) { return p.label === e.target.value; })[0]; F.city = at ? at.city : ""; F.province = at ? at.province : ""; }
    else if (id === "f-area") F.area = e.target.value;
    else if (id === "f-firm") F.firm = e.target.value;
    else if (id === "f-position") F.position = e.target.value;
    else if (id === "f-sort") F.sort = e.target.value;
    else return;
    F.page = 0; // any filter, search or sort starts again from the first page
    list();
  });
  var typing;
  document.addEventListener("input", function (e) {
    if (SEL && (e.target.id === "rd-city" || e.target.id === "rd-province")) {
      var pd = details(SEL);
      pd[e.target.id === "rd-city" ? "city" : "province"] = e.target.value;
      if (e.target.id === "rd-province" && pd.provinceAuto) {
        pd.provinceAuto = false;
        var pn = document.getElementById("rd-place-note"); if (pn) pn.textContent = "Choose your city or municipality from the list: the province is filled in for you.";
      }
      openCombo(e.target); syncRequestButton(); return;
    }
    if (e.target.id === "req-email") { if (SEL) SEL.email = e.target.value; return; } if (e.target.id !== "f-q") return; F.q = e.target.value; F.page = 0; clearTimeout(typing); typing = setTimeout(list, 160); });
  document.addEventListener("keydown", function (e) {
    if (VIEW) {
      // The document pop-up: Escape closes it, and Tab stays inside it.
      if (e.key === "Escape") { e.preventDefault(); closeDocView(); return; }
      if (e.key === "Tab") {
        var stops = [].slice.call(VIEW.el.querySelectorAll("button, iframe")), i = stops.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); stops[stops.length - 1].focus(); } else if (!e.shiftKey && i === stops.length - 1) { e.preventDefault(); stops[0].focus(); }
      }
      return;
    }
    var at = e.target.closest ? e.target : document.body, modal = document.getElementById("modal-root").firstElementChild;
    if (MENU) {
      var rows = [].slice.call(document.querySelectorAll("#menu a")), k = rows.indexOf(document.activeElement);
      if (e.key === "Escape") { e.preventDefault(); closeMenu(true); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") { e.preventDefault(); rows[e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : (k + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length].focus(); return; }
      if (e.key === "Tab" && narrow()) { var all = [document.getElementById("menu-btn")].concat(rows), i = all.indexOf(document.activeElement); e.preventDefault(); all[(i + (e.shiftKey ? all.length - 1 : 1)) % all.length].focus(); return; }
    }
    if (e.key === "Escape") { if (modal) closeProfile(); }
    else if (e.key === "Tab") { if (modal) trap(e, modal); }
    // Left and right arrows turn the page of results while the pager has the focus; Home and End go to the first and last page.
    else if (at.closest("#pager") && (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End")) { e.preventDefault(); turn({ ArrowRight: "next", ArrowLeft: "prev", Home: "first", End: "last" }[e.key]); }
  });
  // A sideways swipe on the cards turns the page on a touch screen.
  var swipe = null;
  document.addEventListener("touchstart", function (e) { swipe = e.touches.length === 1 && e.target.closest && e.target.closest("#grid") ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
  document.addEventListener("touchend", function (e) { if (!swipe) return; var dx = e.changedTouches[0].clientX - swipe[0], dy = e.changedTouches[0].clientY - swipe[1]; swipe = null; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) turn(dx < 0 ? "next" : "prev"); }, { passive: true });

  // ── start: the directory, or the choice that was waiting (back from signing in, or from the identity check) ──
  // "?select=<id>" opens a choice too, for a link from inside LAGDA. Nothing else in the address is read.
  go("market");
  signedIn().then(function () {
    var m = /[?&]select=([A-Za-z0-9-]+)/.exec(location.search), pending = stored(PENDING), id = m ? m[1] : pending && pending.id;
    if (m && history.replaceState) { try { history.replaceState(null, "", location.pathname + location.hash); } catch (err) { /* keep it */ } }
    if (MENU) menuFill();
    if (!id || !byId(id)) return;
    if (ME) choose(id);
    else if (m) store(PENDING, { id: id, at: Date.now() }); // a link from LAGDA while signed out: the choice waits for the sign-in
  });
})();
