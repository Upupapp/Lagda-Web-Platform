// LAGDA eNotary — the Notary Directory, as published on lagda.io/enotary-directory/. Plain JavaScript, no build step.
// A directory, and honest about where eNotary stands: online notarial sessions are NOT open yet. Anyone can browse,
// search, filter and open a profile. Choosing a notary registers the visitor's interest (after signing in to LAGDA and,
// where LAGDA offers it, verifying their identity); nothing is booked and nothing is charged.
// Only lawyers and offices with their own published picture are listed (js/lawyers.js holds only those).
// What each profile shows is the lawyer's own published information: name, firm, position, office, practice areas,
// education, Bar admission, a link to their own page. No rating, review, fee or open time is shown: none is known.
(function () {
  "use strict";
  // Only entries with their own picture, whatever the data file holds.
  var LAWYERS = (window.LAWYERS || []).filter(function (l) { return typeof l.photo === "string" && l.photo && !/default_/.test(l.photo); });
  function byId(id) { return LAWYERS.filter(function (l) { return l.id === id; })[0] || null; }
  var SOON = "Online notarial sessions are not currently available: LAGDA eNotary is subject to Supreme Court accreditation. Choose a notary to register your interest, and we\u2019ll email you when you can book.";
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

  // ── state ───────────────────────────────────────────────────────────────
  var F = { q: "", island: "", region: "", province: "", city: "", area: "", firm: "", position: "", photo: false, sort: "photo", page: 0 };
  var view = document.getElementById("view");
  function uniq(list) { return list.filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort(); }
  function count(key, value) { return LAWYERS.filter(function (l) { return l[key] === value; }).length; }
  var AREAS = (function () { var m = {}; LAWYERS.forEach(function (l) { l.areas.forEach(function (a) { m[a] = (m[a] || 0) + 1; }); }); return Object.keys(m).filter(function (a) { return m[a] >= Math.max(3, Math.round(LAWYERS.length / 100)); }).sort(); })(); // enough entries to be worth a filter, whatever the size of the list
  var SOME_DEFAULT = LAWYERS.some(function (l) { return !l.photo; }); // false while the data holds only entries with their own picture
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
  function placeOptions(key, parentKey, parentValue) { return uniq(LAWYERS.filter(function (l) { return !parentValue || l[parentKey] === parentValue; }).map(function (l) { return l[key]; })); }

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
   * the maroon rule and the place. o.open: the picture and the name open the profile (the result card). o.areas: add the practice areas.
   * o.h: the heading's tag. o.id: the id given to the name, which labels the card.
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
      "</div>";
  }
  function card(l) {
    var name = title(l);
    return '<article class="card' + cardShape(l) + '" data-id="' + esc(l.id) + '" aria-labelledby="cn-' + esc(l.id) + '">' +
      cardTop(l, { open: true, areas: true, h: "h3", id: "cn-" + l.id, after: '<span class="card-pill">' + ICON.seal + (l.notaryAdvertised ? "Notary Public" : "Notarization") + "</span>" }) +
      '<div class="card-foot solo"><button type="button" class="card-view" data-open="' + esc(l.id) + '" aria-label="View the profile of ' + esc(name) + '">View Profile' + CARD_ARROW + "</button></div>" +
    "</article>";
  }

  // The landing: what this place is, who is in it, and how it works.
  function hero(cityCount) {
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
      building: '<svg viewBox="0 0 48 40"><path d="M10 37V5h20v32M30 15h9v22M5 37h39"/><path d="M16 11h2.500M22 11h2.500M16 18h2.500M22 18h2.500M16 25h2.500M22 25h2.500M18 37v-6h4v6"/></svg>',
    };
    var stat = function (icon, n, label) { return '<div class="stat">' + icon + "<div><dt>" + n + "</dt><dd>" + label + "</dd></div></div>"; };

    return '<section class="hero">' + backdrop + '<div class="hero-in">' +
      '<div class="hero-text"><p class="hero-eyebrow">Legal services <i>\u2022</i> Trusted professionals <i>\u2022</i> Philippines</p>' +
        '<h1>Choose the <em>lawyer<svg viewBox="0 0 220 22" preserveAspectRatio="none" aria-hidden="true"><path d="M4 14C60 4 120 3 216 9" /><path d="M150 17c24-4 44-5 64-4"/></svg></em> who will notarize your document</h1>' +
        "<p>Browse lawyers and law offices across the Philippines. Read each one\u2019s profile and choose the notary you trust. Online notarial sessions are not open yet: choose a notary to register your interest, and we\u2019ll email you when you can book.</p>" +
        '<div class="hero-acts"><a class="btn big" href="#where">Find a lawyer</a><a class="btn outline big" href="#how">How it works</a></div>' +
        '<dl class="hero-stats">' + stat(ico.people, LAWYERS.length, "lawyers and offices") + stat(ico.scales, firms, "law firms") + stat(ico.building, cityCount, "cities") + "</dl></div>" +
      '<div class="hero-faces">' + picked.map(function (l, i) {
        return '<figure class="face f' + i + '">' + pic(l, title(l)) + '<figcaption><b>' + esc(title(l)) + "</b><span>" + esc(l.firm) + "</span></figcaption></figure>";
      }).join("") + seal + "</div>" +
    "</div></section>" +
    '<section class="how" id="how"><div class="how-in"><h2>How it works</h2><ol>' +
      [["Find a notary", "Filter by place first, then by practice area, firm or position. Open a profile to read about them."],
       ["Register your interest", "Sign in to LAGDA, verify your identity where LAGDA offers it, and choose to be told when you can book."],
       ["We email you", "Online notarial sessions are not open yet. When they open, you are told first, by email."]]
        .map(function (st, i) { return "<li><span>" + (i + 1) + "</span><div><b>" + st[0] + "</b><p>" + st[1] + "</p></div></li>"; }).join("") +
    "</ol></div></section>";
  }

  // ── where: the place filter, a count by city, and the map ───────────────
  // The islands, simplified, as longitude and latitude. Drawn for orientation only.
  var ISLANDS = [
    [[120.57,18.5],[121.0,18.62],[121.9,18.3],[122.2,17.4],[122.45,16.9],[122.2,16.2],[121.6,15.8],[121.6,14.9],[121.8,14.2],[122.3,13.95],[122.9,14.1],[123.3,13.9],[123.9,13.8],[124.1,13.0],[124.1,12.55],[123.8,12.9],[123.3,13.2],[122.8,13.5],[122.5,13.6],[122.0,13.8],[121.6,13.9],[121.3,13.65],[120.9,13.75],[120.6,14.2],[120.95,14.5],[120.6,14.5],[120.4,14.6],[120.25,14.85],[120.1,15.3],[119.9,15.8],[119.8,16.3],[120.3,16.05],[120.35,16.6],[120.4,17.5]],
    [[120.4,13.5],[121.1,13.5],[121.5,13.1],[121.55,12.6],[121.2,12.25],[120.9,12.4],[120.75,13.0]],
    [[119.5,11.4],[119.75,11.1],[119.3,10.5],[118.7,9.8],[118.0,9.1],[117.3,8.5],[117.15,8.35],[117.6,9.0],[118.5,10.0],[119.0,10.6],[119.3,11.2]],
    [[121.9,11.9],[122.6,11.6],[123.15,11.55],[123.0,11.0],[122.6,10.65],[122.0,10.45],[121.9,10.9],[122.05,11.6]],
    [[123.2,10.95],[123.55,10.75],[123.4,10.3],[123.3,9.6],[123.15,9.05],[122.65,9.35],[122.4,9.8],[122.75,10.1],[122.85,10.6]],
    [[124.05,11.3],[124.0,10.8],[123.7,10.2],[123.4,9.45],[123.35,9.75],[123.6,10.4],[123.85,11.0]],
    [[123.8,10.15],[124.45,10.1],[124.6,9.8],[124.2,9.6],[123.85,9.7]],
    [[124.3,11.5],[124.9,11.4],[125.05,10.9],[125.25,10.3],[124.95,10.05],[124.75,10.5],[124.4,10.8],[124.35,11.2]],
    [[124.3,12.55],[125.0,12.6],[125.5,12.2],[125.75,11.3],[125.5,11.05],[125.0,11.3],[124.8,11.7],[124.5,12.1]],
    [[123.2,12.55],[123.9,12.25],[124.05,11.9],[123.6,11.95],[123.25,12.2]],
    [[125.4,9.8],[126.2,9.2],[126.4,8.3],[126.6,7.3],[126.2,6.4],[125.7,6.1],[125.7,7.0],[125.4,6.8],[125.4,5.6],[125.1,5.9],[124.6,6.0],[124.0,6.4],[124.05,7.1],[123.6,7.6],[123.3,7.4],[122.9,7.6],[122.2,7.0],[121.9,6.95],[122.1,7.6],[122.6,8.1],[123.0,8.5],[123.5,8.6],[123.8,8.15],[124.2,8.2],[124.6,8.5],[124.8,9.0],[125.1,8.9]],
    [[121.75,20.5],[121.95,20.5],[121.95,20.3],[121.75,20.3]], [[121.7,19.4],[121.95,19.4],[121.95,19.2],[121.7,19.2]], [[121.35,18.95],[121.55,18.95],[121.55,18.8],[121.35,18.8]],
    [[122.0,12.6],[122.15,12.6],[122.15,12.3],[122.0,12.3]], [[124.15,13.9],[124.4,13.95],[124.4,13.6],[124.15,13.6]], [[120.0,12.2],[120.3,12.2],[120.3,11.95],[120.0,11.95]],
    [[121.0,6.1],[121.35,6.05],[121.3,5.9],[121.0,5.95]], [[119.9,5.3],[120.2,5.3],[120.2,5.1],[119.9,5.1]], [[126.0,9.95],[126.15,9.95],[126.15,9.7],[126.0,9.7]],
  ];
  var CITY_AT = { "Makati City": [121.02, 14.55], "Taguig City": [121.05, 14.52], "Pasig City": [121.08, 14.58], "Quezon City": [121.05, 14.68], "Manila": [120.98, 14.6], "Naga City": [123.18, 13.62], "Cebu City": [123.89, 10.31], "Davao City": [125.6, 7.07] };
  function where(cities) {
    var max = count("city", cities[0]) || 1;
    var bars = cities.map(function (c) {
      var n = count("city", c);
      return '<li><button type="button" data-city="' + esc(c) + '" class="' + (F.city === c ? "is-on" : "") + '" aria-pressed="' + (F.city === c) + '">' + esc(c) + '</button><span class="bar-track"><i style="width:' + Math.max(2.5, n / max * 100).toFixed(1) + '%"></i><b>' + n + "</b></span></li>";
    }).join("");

    // Map: one mark per place. Metro Manila's cities share a mark, since they sit on top of each other at this scale.
    var X = function (lon) { return (lon - 116.3) * 30; }, Y = function (lat) { return (21 - lat) * 31; };
    var land = ISLANDS.map(function (poly) { return '<path d="M' + poly.map(function (pt) { return X(pt[0]).toFixed(1) + " " + Y(pt[1]).toFixed(1); }).join("L") + 'Z"/>'; }).join("");
    var groups = {};
    LAWYERS.forEach(function (l) {
      var key = l.province === "Metro Manila" ? "Metro Manila" : l.city, at = l.province === "Metro Manila" ? [121.03, 14.58] : CITY_AT[l.city];
      if (!at) return;
      groups[key] = groups[key] || { name: key, n: 0, at: at, metro: key === "Metro Manila", region: l.region, province: l.province };
      groups[key].n++;
    });
    var marks = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return b.n - a.n; });
    var top = marks[0] ? marks[0].n : 1;
    var dots = "", labels = "";
    marks.forEach(function (m) {
      var cx = X(m.at[0]), cy = Y(m.at[1]), r = Math.max(4.5, Math.sqrt(m.n / top) * 26);
      var left = m.metro, lx = left ? cx - r - 54 : 345, ly = left ? cy : cy + (m.name === "Naga City" ? -30 : 0);
      var on = m.metro ? F.province === "Metro Manila" && !F.city : F.city === m.name;
      dots += '<path class="lead" d="M' + cx.toFixed(1) + " " + cy.toFixed(1) + (left ? "H" + (lx + 4).toFixed(1) : "L" + (cx + 28).toFixed(1) + " " + ly.toFixed(1) + "H" + (lx - 6)) + '"/>' +
        '<circle class="dot' + (on ? " is-on" : "") + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '"/>';
      labels += '<g class="map-label' + (on ? " is-on" : "") + '" role="button" tabindex="0" ' + (m.metro ? 'data-province="Metro Manila"' : 'data-city="' + esc(m.name) + '"') + ' aria-label="' + esc(m.name) + ", " + m.n + ' listed">' +
        (left
          ? '<text x="' + lx.toFixed(1) + '" y="' + (ly - 3).toFixed(1) + '" text-anchor="end">' + esc(m.name) + '</text><text class="n" x="' + lx.toFixed(1) + '" y="' + (ly + 17).toFixed(1) + '" text-anchor="end">' + m.n + "</text>"
          : '<text x="' + lx + '" y="' + (ly + 5).toFixed(1) + '">' + esc(m.name) + '<tspan class="n" dx="9">' + m.n + "</tspan></text>") + "</g>";
    });

    return '<section class="where" id="where"><div class="where-in">' +
      '<div class="where-head"><h2>Where should your notary be?</h2><p>A notary acts within the place of their commission, so start with the place.</p></div>' +
      '<div class="where-pick">' +
        '<div class="field"><label for="f-island">Island group</label><select id="f-island">' + options(placeOptions("island"), F.island, "All of the Philippines") + "</select></div>" +
        '<div class="field"><label for="f-region">Region</label><select id="f-region">' + options(placeOptions("region", "island", F.island), F.region, "All regions") + "</select></div>" +
        '<div class="field"><label for="f-province">Province</label><select id="f-province">' + options(placeOptions("province", "region", F.region), F.province, "All provinces") + "</select></div>" +
        '<div class="field"><label for="f-city">City or municipality</label><select id="f-city">' + options(placeOptions("city", "province", F.province), F.city, "All cities") + "</select></div>" +
        '<button type="button" class="btn outline" id="place-clear">Show all places</button></div>' +
      '<div class="where-bars"><h3>Lawyers and offices listed, by city</h3><ul>' + bars + "</ul></div>" +
      '<div class="where-map"><svg viewBox="-60 0 520 500" role="group" aria-label="Map of the Philippines with the places listed">' +
        '<g class="land">' + land + "</g>" + dots + labels + "</svg></div>" +
    "</div></section>";
  }

  function market() {
    var cities = uniq(LAWYERS.map(function (l) { return l.city; })).sort(function (a, b) { return count("city", b) - count("city", a); });
    view.innerHTML = hero(cities.length) + where(cities) + '<div class="wrap" id="find">' +

      '<section class="tools ' + (SOME_DEFAULT ? "four" : "three") + '" aria-label="Other filters">' +
        '<div class="field"><label for="f-q">Search</label><input id="f-q" type="search" placeholder="Name, firm or practice area" value="' + esc(F.q) + '"></div>' +
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
    var where = F.city || F.province || F.region || F.island || "the Philippines";
    document.getElementById("count").innerHTML = FOUND.length + (FOUND.length === 1 ? " result" : " results") + " <span>in " + esc(where) + "</span>";
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
    var y = years(l), big = whole(l), place = l.city + ", " + l.province;
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
      '<div class="pf-foot"><p class="pf-note">The profile shown is the lawyer\'s own published information. Choose this notary to be told when you can book.</p>' +
        '<button type="button" class="btn outline" data-close>Close</button><button type="button" class="btn" data-select="' + esc(l.id) + '">Select this notary</button></div></div></div>';
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
        body = '<h3 id="step-h" tabindex="-1">' + CI.mail + "Request this notary</h3>" +
          '<p class="lead">LAGDA gives you a private link and a QR code, good for a limited time, to give to the notary. The notary signs in to LAGDA and passes an ID and face check before they can answer your request.</p>' +
          '<dl class="summary"><div><dt>Notary</dt><dd>' + name + (l.kind === "office" ? "" : ", " + esc(l.firm)) + "<br>" + esc(l.city + ", " + l.province) + "</dd></div>" +
            "<div><dt>Your name</dt><dd>" + esc(ME.name) + "</dd></div><div><dt>Identity verified in LAGDA</dt><dd>Yes</dd></div></dl>" +
          detailsForm(SEL) +
          reach +
          '<p class="fine left">Nothing is booked, paid or notarized by this step. Online notarial sessions are not currently available.</p>' +
          (SEL.error ? '<p class="err-box" role="alert" id="step-err" tabindex="-1">' + esc(SEL.error) + "</p>" : "");
        bar = '<button type="button" class="btn outline" data-go="market" data-forget>Browse other notaries</button><button type="button" class="btn big" data-request' + (SEL.busy || !detailsReady(SEL) ? " disabled" : "") + ">" + (SEL.busy ? "Sending…" : "Request this notary") + "</button>";
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
    api("POST", "/me/identity/session", { consent: true }).then(function (r) {
      var shut = function () { if (tab) { try { tab.close(); } catch (err) { /* gone */ } } };
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
  function ask() {
    var sel = SEL; if (!sel || sel.step !== "identity" || asking) return;
    asking = true;
    api("POST", "/me/identity/session/refresh").then(function (r) {
      asking = false;
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
        '<label class="idv-agree" aria-disabled="true"><input type="radio" name="rd-where" id="rd-abroad" disabled><span>Outside the Philippines <em class="idchip">Coming soon</em></span></label>' +
        '<p class="fine left">LAGDA eNotary serves people who are in the Philippines for now. Notarizing for Filipinos abroad is coming soon.</p>' +
        '<div class="two"><div class="field"><label for="rd-city">City or municipality</label><input id="rd-city" type="text" maxlength="80" autocomplete="address-level2" value="' + esc(d.city) + '"></div>' +
        '<div class="field"><label for="rd-province">Province</label><input id="rd-province" type="text" maxlength="80" autocomplete="address-level1" value="' + esc(d.province) + '"></div></div></div>' +
      '<label class="idv-agree"><input type="checkbox" id="rd-abroad-use"' + (d.usedAbroad ? " checked" : "") + '><span>The document will be used outside the Philippines.</span></label>' +
      (d.usedAbroad ? '<p class="fine left" role="note"><b>Please note.</b> A document for use abroad may need an apostille after it is notarized. Ask the office that will receive it what it needs.</p>' : "") +
      "</fieldset>";
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
    api("POST", "/me/enotary/invitations", body).then(function (r) {
      if (SEL !== sel) return;
      var inv = r.ok && r.data ? r.data.invitation || r.data : null;
      if (inv && inv.id) { store(PENDING, null); location.assign(requestPath(inv.id)); return; }
      sel.busy = false;
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
    api("POST", "/public/inquiries", body).then(function (r) {
      if (SEL !== sel) return;
      sel.busy = false;
      if (r.ok) { var list = done(); if (list.indexOf(l.id) < 0) list.push(l.id); store(DONE, list); store(PENDING, null); sel.step = "done"; redraw(true); toast("Your interest is saved"); return; }
      sel.error = plainError(r); redraw(false); landed();
    });
  }

  // ── the page frame: the bar for a phone, the menu, the views ──
  function barHeight() { var bar = document.querySelector(".flow .bar"), h = bar && getComputedStyle(bar).position === "fixed" ? Math.ceil(bar.getBoundingClientRect().height) : 0; document.body.style.setProperty("--bar", h + "px"); }
  window.addEventListener("resize", barHeight);
  function keepPlace() { var el = document.getElementById("where"); if (el) el.scrollIntoView({ block: "start" }); }
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
    var t = e.target.closest("[data-go],[data-open],[data-select],[data-close],[data-city],[data-province],[data-page],[data-clear],[data-step],[data-idv-start],[data-idv-ask],[data-idv-retry],[data-idv-reload],[data-register],[data-request],#clear,#place-clear,#veil");
    if (!t) return;
    if (t.id === "veil") { if (e.target === t) closeProfile(); return; }
    if (t.hasAttribute("data-go")) { e.preventDefault(); if (t.hasAttribute("data-forget")) forget(); go(t.getAttribute("data-go")); }
    else if (t.hasAttribute("data-open")) profile(t.getAttribute("data-open"));
    else if (t.hasAttribute("data-page")) { if (t.getAttribute("aria-disabled") !== "true") turn(t.getAttribute("data-page")); }
    else if (t.hasAttribute("data-select")) choose(t.getAttribute("data-select"));
    else if (t.hasAttribute("data-close")) closeProfile();
    else if (t.hasAttribute("data-province")) { var prov = t.getAttribute("data-province"); var was = F.province === prov && !F.city; var one = LAWYERS.filter(function (x) { return x.province === prov; })[0]; F.city = ""; F.province = was ? "" : prov; F.region = was ? "" : one.region; F.island = was ? "" : one.island; F.page = 0; market(); keepPlace(); }
    else if (t.hasAttribute("data-city")) { var c = t.getAttribute("data-city"); var on = F.city !== c; var ref = LAWYERS.filter(function (x) { return x.city === c; })[0]; F.city = on ? c : ""; F.province = on ? ref.province : ""; F.region = on ? ref.region : ""; F.island = on ? ref.island : ""; F.page = 0; market(); keepPlace(); }
    else if (t.hasAttribute("data-clear") || t.id === "clear") reset();
    else if (t.id === "place-clear") { F.island = F.region = F.province = F.city = ""; F.page = 0; market(); keepPlace(); }
    else if (!SEL) return;
    else if (t.hasAttribute("data-step")) { if (t.hasAttribute("data-outcome")) SEL.outcome = t.getAttribute("data-outcome"); SEL.step = t.getAttribute("data-step"); SEL.error = ""; store(CHECK, null); redraw(true); }
    else if (t.hasAttribute("data-idv-start")) { if (SEL.agree) startCheck(); }
    else if (t.hasAttribute("data-idv-ask")) ask();
    else if (t.hasAttribute("data-idv-retry")) { if (t.hasAttribute("data-back-to-identity")) { SEL.step = "identity"; INV = undefined; } SEL.idv = "consent"; SEL.error = ""; store(CHECK, null); redraw(true); }
    else if (t.hasAttribute("data-idv-reload")) readIdentity();
    else if (t.hasAttribute("data-register")) register();
    else if (t.hasAttribute("data-request")) request();
  });
  function syncRequestButton() { var b = document.querySelector("[data-request]"); if (b && SEL) b.disabled = !!SEL.busy || !detailsReady(SEL); }
  document.addEventListener("change", function (e) {
    var id = e.target.id;
    if (SEL && (id === "rd-act" || id === "rd-kind" || id === "rd-abroad-use")) {
      var dd = details(SEL);
      if (id === "rd-act") dd.act = e.target.value; else if (id === "rd-kind") dd.kind = e.target.value; else dd.usedAbroad = e.target.checked;
      SEL.error = ""; redraw(false); return;
    }
    if (id === "idv-agree" || id === "int-agree") { if (SEL) { SEL.agree = e.target.checked; var b = document.querySelector(id === "idv-agree" ? "[data-idv-start]" : "[data-register]"); if (b) b.disabled = !SEL.agree || SEL.busy; } return; }
    if (id === "f-island") { F.island = e.target.value; F.region = F.province = F.city = ""; }
    else if (id === "f-region") { F.region = e.target.value; F.province = F.city = ""; }
    else if (id === "f-province") { F.province = e.target.value; F.city = ""; }
    else if (id === "f-city") { F.city = e.target.value; }
    else if (id === "f-area") F.area = e.target.value;
    else if (id === "f-firm") F.firm = e.target.value;
    else if (id === "f-position") F.position = e.target.value;
    else if (id === "f-sort") F.sort = e.target.value;
    else return;
    F.page = 0; // any filter, search or sort starts again from the first page
    if (id === "f-sort" || id === "f-area" || id === "f-firm" || id === "f-position") list(); else { market(); keepPlace(); }
  });
  var typing;
  document.addEventListener("input", function (e) {
    if (SEL && (e.target.id === "rd-city" || e.target.id === "rd-province")) { details(SEL)[e.target.id === "rd-city" ? "city" : "province"] = e.target.value; syncRequestButton(); return; }
    if (e.target.id === "req-email") { if (SEL) SEL.email = e.target.value; return; } if (e.target.id !== "f-q") return; F.q = e.target.value; F.page = 0; clearTimeout(typing); typing = setTimeout(list, 160); });
  document.addEventListener("keydown", function (e) {
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
    else if ((e.key === "Enter" || e.key === " ") && at.closest(".map-label")) { e.preventDefault(); at.closest(".map-label").dispatchEvent(new MouseEvent("click", { bubbles: true })); }
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
