/* ==========================================================================
   sunny natural — script.js (ใช้ร่วมกันทุกหน้า)
   - product.html : แสดงการ์ดสินค้า + กรองตาม mood
   - order.html   : เติมชื่อสินค้า/ราคาจาก URL และส่งออเดอร์ไป Apps Script
   - admin.html   : แสดงออเดอร์จาก Google Sheet (CSV) เป็นตาราง
   แต่ละฟังก์ชันจะทำงานเฉพาะเมื่อเจอ element ของหน้านั้นๆ
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- ค่าคงที่ ---------- */
  const ORDER_ENDPOINT =
    'https://script.google.com/macros/s/AKfycbweWDI9AZi4GqF7mi7CLlgtC8kEvJRvZbbj5JldKnxvXrM5Ol8v9uxXx5w1bqkEcHoQ/exec';

  const ORDERS_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSMp3oqg2JBc5O81vtnxy_2J8E6QkJ20-tU0wjPG9uhnnNuldru6wftfBhYRNyASYIU8aILbnOTUPpx/pub?gid=0&single=true&output=csv';

  /* ข้อมูลเสริมของแต่ละ mood: key ใช้ใน ?mood=xxx, cls คือ class จุดสีใน style.css
     เพิ่ม mood ใหม่ได้ที่นี่ (ปุ่มกรองสร้างจากค่า mood ใน products.json อัตโนมัติ) */
  const MOOD_META = {
    'sunny natural อัญชันและมะกรูด': { key: 'anchan', cls: 'mood--anchan' },
    'sunny natural น้ำผึ้ง&อะโวคาโด': { key: 'honey', cls: 'mood--honey' }
  };

  /* ---------- ตัวช่วย ---------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function moodLabel(mood) {
    return String(mood).replace(/^sunny natural\s*/i, '');
  }

  function formatMoney(value) {
    const n = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(n) && String(value).trim() !== ''
      ? n.toLocaleString('th-TH')
      : String(value);
  }

  /* ==========================================================================
     1) product.html
     ========================================================================== */
  function initProducts() {
    const list = document.getElementById('product-list');
    if (!list) return;
    const bar = document.getElementById('filter-bar');

    fetch('products.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (products) {
        const moods = Array.from(new Set(products.map(function (p) { return p.mood; })));
        let current = resolveMood(new URLSearchParams(window.location.search).get('mood'), moods);

        function render() {
          list.replaceChildren();
          const shown = current
            ? products.filter(function (p) { return p.mood === current; })
            : products;

          if (!shown.length) {
            list.appendChild(el('p', 'muted', 'ยังไม่มีสินค้าในหมวดนี้'));
            return;
          }
          shown.forEach(function (p) { list.appendChild(buildCard(p)); });
        }

        function setMood(mood) {
          current = mood;
          if (bar) {
            bar.querySelectorAll('button').forEach(function (btn) {
              const active = btn.dataset.mood === current;
              btn.classList.toggle('btn--solid', active);
              btn.setAttribute('aria-pressed', String(active));
            });
          }
          // อัปเดต URL ให้แชร์ลิงก์ที่กรองไว้ได้ (ไม่เพิ่มประวัติ back)
          const url = new URL(window.location.href);
          if (current) {
            const meta = MOOD_META[current];
            url.searchParams.set('mood', meta ? meta.key : moodLabel(current));
          } else {
            url.searchParams.delete('mood');
          }
          window.history.replaceState(null, '', url);
          render();
        }

        if (bar) {
          bar.replaceChildren();
          [''].concat(moods).forEach(function (mood) {
            const btn = el('button', 'btn', mood ? moodLabel(mood) : 'ทั้งหมด');
            btn.type = 'button';
            btn.dataset.mood = mood;
            btn.addEventListener('click', function () { setMood(mood); });
            bar.appendChild(btn);
          });
        }

        setMood(current);
      })
      .catch(function (error) {
        console.error(error);
        list.replaceChildren(
          el('p', 'muted', 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง')
        );
      });
  }

  /* แปลงค่า ?mood=xxx เป็นค่า mood เต็มใน products.json
     รับได้ทั้ง key (anchan), ชื่อสั้น (อัญชันและมะกรูด) หรือชื่อเต็ม */
  function resolveMood(param, moods) {
    if (!param) return '';
    const q = param.trim().toLowerCase();
    const found = moods.find(function (m) {
      const meta = MOOD_META[m];
      return (
        q === m.toLowerCase() ||
        q === moodLabel(m).toLowerCase() ||
        (meta && q === meta.key)
      );
    });
    return found || '';
  }

  function buildCard(p) {
    const meta = MOOD_META[p.mood];

    const card = el('article', 'product-card');

    const imageWrap = el('div', 'product-card__image');
    const img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';
    imageWrap.appendChild(img);

    const body = el('div', 'product-card__body');
    body.appendChild(el('span', 'mood ' + (meta ? meta.cls : ''), moodLabel(p.mood)));
    body.appendChild(el('h3', 'product-card__title', p.name));
    body.appendChild(el('p', 'product-card__meta', 'ไซส์ ' + p.size));

    const footer = el('div', 'product-card__footer');
    const price = el('span', 'price', formatMoney(p.price));
    price.appendChild(el('small', '', 'บาท'));
    footer.appendChild(price);
    body.appendChild(footer);

    // ส่งชื่อสินค้าและราคาไปหน้า order — URLSearchParams เข้ารหัสอักขระพิเศษ (เช่น &) ให้เอง
    const query = new URLSearchParams({ item: p.name, price: String(p.price) });
    const order = el('a', 'btn btn--solid btn--block', 'สั่งซื้อ');
    order.href = 'order.html?' + query.toString();
    order.style.marginTop = 'var(--space-2)';
    body.appendChild(order);

    card.appendChild(imageWrap);
    card.appendChild(body);
    return card;
  }

  /* ==========================================================================
     2) order.html
     ========================================================================== */
  function initOrder() {
    const form = document.getElementById('orderForm');
    if (!form) return;

    // เติมช่อง items และ total จาก URL ทันทีที่โหลดหน้า
    const params = new URLSearchParams(window.location.search);
    const itemsInput = document.getElementById('items');
    const totalInput = document.getElementById('total');
    const item = params.get('item');
    const price = params.get('price');

    if (itemsInput && item !== null) itemsInput.value = item;
    if (totalInput && price !== null) totalInput.value = price;

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      const payload = {
        customerName: document.getElementById('customerName').value,
        contact: document.getElementById('contact').value,
        items: document.getElementById('items').value,
        total: document.getElementById('total').value,
        note: document.getElementById('note').value
      };

      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true; // กันกดซ้ำระหว่างส่ง

      fetch(ORDER_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
        .then(() => { window.location.href = 'thankyou.html'; })
        .catch(error => {
          console.error(error);
          if (submitBtn) submitBtn.disabled = false;
          alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        });
    });
  }

  /* ==========================================================================
     3) admin.html
     ========================================================================== */

  /* parse CSV เอง: รองรับ field ในเครื่องหมายคำพูด, "" แทน ", คอมมาและขึ้นบรรทัดใหม่ใน field */
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    text = text.replace(/^\uFEFF/, '');

    for (let i = 0; i < text.length; i++) {
      const c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }

    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }

    // ตัดแถวว่างทิ้ง
    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ''; });
    });
  }

  function initAdmin() {
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    const COLUMNS = 6; // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ

    function showMessage(message) {
      const tr = document.createElement('tr');
      const td = el('td', 'muted', message);
      td.colSpan = COLUMNS;
      tr.appendChild(td);
      tbody.replaceChildren(tr);
    }

    showMessage('กำลังโหลดข้อมูล...');

    fetch(ORDERS_CSV_URL, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        // แถวแรกคือหัวคอลัมน์ ข้ามไป แล้วกลับลำดับให้รายการล่าสุดขึ้นก่อน
        const rows = parseCSV(text).slice(1).reverse();

        if (!rows.length) {
          showMessage('ยังไม่มีรายการสั่งซื้อ');
          return;
        }

        const fragment = document.createDocumentFragment();
        rows.forEach(function (row) {
          const tr = document.createElement('tr');
          for (let i = 0; i < COLUMNS; i++) {
            const value = row[i] !== undefined ? row[i] : '';
            // textContent เสมอ เพราะข้อมูลมาจากลูกค้า ป้องกันการแทรก HTML
            tr.appendChild(el('td', '', i === 4 ? formatMoney(value) : value));
          }
          fragment.appendChild(tr);
        });
        tbody.replaceChildren(fragment);
      })
      .catch(function (error) {
        console.error(error);
        showMessage('โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง');
      });
  }

  /* ---------- เริ่มทำงาน ---------- */
  function init() {
    initProducts();
    initOrder();
    initAdmin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
