/* 확인 문제 공용 엔진
   차시 페이지(02-04-01-1-quiz.html 등)에는 문제 데이터만 두고, 동작은 모두 이 파일이 맡습니다.
   사용법: 퀴즈시작({ 단원, 단원명, 제목, 한번에, 지도열, 카테고리목록, 문제전체 })

   · 카테고리목록은 생략해도 됩니다. (차시 하나만 담긴 페이지) 그때는 카테고리 탭 없이
     문제 전체가 한 묶음으로 나옵니다.
   · 문제의 정답이 배열이면([1, 4]) 보기를 여러 개 골라야 하는 문제로 처리합니다.
   · 사회 수업방의 quiz-engine.js와 같은 오답노트(저장 형식 포함)를 쓰고, 위 두 가지를 더했습니다. */
(function () {
  'use strict';

  const 동그라미 = ['①', '②', '③', '④', '⑤', '⑥'];

  function 셔플(원본배열) {
    const a = 원본배열.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* 문제에는 번호표가 없어서 지문·설명·보기 내용으로 문제를 알아봅니다.
     (정답·해설·그림을 고쳐도 학생이 담아 둔 오답노트는 그대로 이어집니다) */
  function 문제열쇠(문제) {
    const s = 문제.지문 + '\u0001' + (문제.설명박스 || []).join('\u0002') + '\u0001' + 문제.보기.join('\u0002');
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function 요소(태그, 클래스, 글) {
    const el = document.createElement(태그);
    if (클래스) el.className = 클래스;
    if (글 !== undefined) el.textContent = 글;
    return el;
  }

  /* 정답은 숫자 하나, 또는 여러 개를 골라야 하면 숫자 배열입니다. 항상 오름차순 배열로 돌려줍니다. */
  function 정답목록(문제) {
    return (Array.isArray(문제.정답) ? 문제.정답 : [문제.정답]).slice().sort((a, b) => a - b);
  }

  /* 오답노트에 저장된 '고른 답'(숫자 하나 또는 배열)을 오름차순 배열로 바꿉니다. */
  function 고른목록(값) {
    if (Array.isArray(값)) return 값.slice().sort((a, b) => a - b);
    return 값 === null || 값 === undefined ? [] : [값];
  }

  function 같은목록(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  function 설명박스만들기(문제) {
    if (!문제.설명박스) return null;
    const 박스 = 요소('div', '설명박스');
    문제.설명박스.forEach(줄 => 박스.appendChild(요소('p', '', 줄)));
    return 박스;
  }

  function 지도만들기(문제, 바로불러오기) {
    if (!(문제.지도 && 문제.지도.length)) return null;
    const 래퍼 = 요소('div', '지도래퍼');
    const 목록 = 요소('div', '지도목록 ' + (문제.지도.length > 1 ? '칸2' : '칸1'));
    문제.지도.forEach(m => {
      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.src = m.파일;
      img.alt = m.라벨 ? m.라벨 + ' 자료' : '참고 자료';
      if (!바로불러오기) img.loading = 'lazy';
      fig.appendChild(img);
      if (m.라벨) fig.appendChild(요소('figcaption', '', m.라벨));
      목록.appendChild(fig);
    });
    래퍼.appendChild(목록);
    return 래퍼;
  }

  function 오늘글() {
    const d = new Date();
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  window.퀴즈시작 = function (설정) {
    const 단원 = 설정.단원;
    const 단원명 = 설정.단원명 || '';
    const 한번에 = 설정.한번에 || 5;
    const 문제전체 = 설정.문제전체;

    const 분류있음 = Array.isArray(설정.카테고리목록) && 설정.카테고리목록.length > 0;
    const 카테고리목록 = 분류있음 ? 설정.카테고리목록 : [{ key: '', label: '' }];
    const 분류문제 = key => 문제전체.filter(q => !분류있음 || q.카테고리 === key);
    const 여러개문제있음 = 문제전체.some(q => Array.isArray(q.정답));
    const 묶음최대 = Math.max(...카테고리목록.map(c => 분류문제(c.key).length));

    const 루트 = document.getElementById('퀴즈');
    if (설정.지도열) 루트.style.setProperty('--지도열', String(설정.지도열));

    루트.innerHTML = `
      <a class="뒤로" href="../index.html">‹ 자료실로</a>
      <div class="머리">
        <div class="제목"></div>
        <div class="안내"></div>
      </div>

      <div class="화면탭">
        <button type="button" class="화면탭버튼 활성" data-화면="풀이">문제 풀기</button>
        <button type="button" class="화면탭버튼" data-화면="노트">오답노트 <b id="노트수">0</b></button>
      </div>

      <div id="풀이화면">
        ${분류있음 ? '<div class="카테고리바" id="카테고리바"></div>' : ''}
        <div class="상태바">
          <span class="요약" id="요약"></span>
          <div class="상태버튼들">
            <button type="button" class="다시버튼" id="다시풀기" hidden>다시 풀기</button>
            <button type="button" class="더버튼" id="문제더풀기" hidden>문제 더 풀기</button>
          </div>
        </div>
        <div id="문제목록"></div>
      </div>

      <div id="노트화면" hidden>
        <div class="인쇄제목"><b></b><span></span></div>
        <div class="노트머리">
          <div class="노트제목">오답노트 <span id="노트개수글"></span></div>
          <div class="노트설명">풀면서 틀렸거나 헷갈려서 담아 둔 문제예요. 내가 고른 답과 정답·해설이 함께 들어 있어요.</div>
          <div class="노트도구">
            <button type="button" class="저장버튼" id="노트저장">PDF로 저장</button>
            <button type="button" class="비움버튼" id="노트비우기">모두 비우기</button>
          </div>
          <details class="저장안내">
            <summary>PDF로 저장하는 방법</summary>
            <ul>
              <li><b>컴퓨터·크롬북·안드로이드</b> — 인쇄 창에서 '대상(프린터)'을 'PDF로 저장'으로 바꾼 뒤 저장하세요.</li>
              <li><b>아이패드·아이폰</b> — 공유 → '프린트' → 미리보기를 두 손가락으로 벌리기 → 공유 → '파일에 저장'.</li>
              <li>카카오톡 같은 앱 안에서 열었다면 사파리나 크롬으로 열어 주세요.</li>
            </ul>
          </details>
        </div>
        <div id="노트목록"></div>
        <div class="노트안내">오답노트는 이 기기에만 저장돼요. 오래 두고 싶다면 PDF로 남겨 두세요.</div>
      </div>
    `;

    const $ = 선택자 => 루트.querySelector(선택자);

    $('.제목').textContent = 설정.제목;
    $('.안내').textContent = 설정.안내 || [
      분류있음 ? '카테고리를 골라 풀어보세요.' : '',
      '답을 고르면 번호 왼쪽에 제출 버튼이 나타나고, 제출하면 정답과 해설을 볼 수 있어요.',
      여러개문제있음 ? '정답을 2개 골라야 하는 문제도 있어요.' : '',
      묶음최대 > 한번에
        ? (분류있음 ? '한 카테고리에 최대 ' + 한번에 + '문제씩 나오고, ' : '먼저 ' + 한번에 + '문제가 나오고, ') +
          '다 풀면 \'문제 더 풀기\'로 이어서 풀 수 있어요.'
        : '',
      '틀리거나 헷갈린 문제는 \'오답노트\'에 담아 두었다가 PDF로 저장할 수 있어요.'
    ].filter(Boolean).join(' ');

    /* ── 오답노트 저장 (이 기기에만, 단원별로) ── */
    const 저장키 = '오답노트:' + 단원;

    function 노트읽기() {
      try {
        const 값 = JSON.parse(localStorage.getItem(저장키) || '[]');
        return Array.isArray(값) ? 값 : [];
      } catch (e) { return []; }
    }

    let 노트 = 노트읽기();   /* [{ k: 문제열쇠, c: 고른 보기 번호(여러 개면 배열), ok: 맞았는지, t: 시각 }] */

    const 열쇠맵 = new Map();
    문제전체.forEach((문제, 순번) => {
      const k = 문제열쇠(문제);
      if (열쇠맵.has(k)) return;
      const 분류순서 = Math.max(0, 카테고리목록.findIndex(c => c.key === 문제.카테고리));
      열쇠맵.set(k, { 문제, 정렬: 분류순서 * 1000 + 순번 });
    });

    function 노트찾기(k) { return 노트.find(e => e.k === k); }

    function 노트수갱신() {
      const n = 노트.filter(e => 열쇠맵.has(e.k)).length;
      $('#노트수').textContent = n;
      $('.화면탭버튼[data-화면="노트"]').classList.toggle('있음', n > 0);
    }

    function 노트저장() {
      try { localStorage.setItem(저장키, JSON.stringify(노트)); } catch (e) { /* 저장이 막힌 기기에서는 이번 접속 동안만 유지됩니다 */ }
      노트수갱신();
    }

    function 노트넣기(k, 고른값, 맞음) {
      const 있음 = 노트찾기(k);
      if (있음) { 있음.c = 고른값; 있음.ok = 맞음; 있음.t = Date.now(); }
      else 노트.push({ k, c: 고른값, ok: 맞음, t: Date.now() });
      노트저장();
    }

    function 노트빼기(k) {
      노트 = 노트.filter(e => e.k !== k);
      노트저장();
    }

    /* ── 문제 풀기 ── */
    let 현재카테고리 = 카테고리목록[0].key;
    let 카테고리풀 = [];
    let 표시개수 = 0;
    let 제출됨 = [];
    let 정답수 = 0;

    function 카테고리바그리기() {
      const 칸 = $('#카테고리바');
      if (!칸) return;
      칸.innerHTML = '';
      카테고리목록.forEach(c => {
        const b = 요소('button', '카테고리' + (c.key === 현재카테고리 ? ' 활성' : ''));
        b.type = 'button';
        b.innerHTML = c.label + ' <b>' + 분류문제(c.key).length + '</b>';
        b.onclick = () => 카테고리선택(c.key);
        칸.appendChild(b);
      });
    }

    function 문제카드만들기(문제, idx) {
      const 열쇠 = 문제열쇠(문제);
      const 다중 = Array.isArray(문제.정답);
      const 카드 = 요소('div', '문제카드');

      const 머리 = 요소('div', '문제머리');
      const 제출버튼 = 요소('button', '제출버튼', '제출');
      제출버튼.type = 'button';
      머리.append(제출버튼, 요소('span', '번호', String(idx + 1)), 요소('div', '지문', 문제.지문));
      카드.appendChild(머리);

      const 박스 = 설명박스만들기(문제);
      if (박스) 카드.appendChild(박스);
      const 지도 = 지도만들기(문제, false);
      if (지도) 카드.appendChild(지도);

      const 보기목록 = 요소('div', '보기목록');
      const 보기라벨들 = [];

      문제.보기.forEach((글, i) => {
        const 라벨 = 요소('label', '보기');
        const 입력 = document.createElement('input');
        입력.type = 다중 ? 'checkbox' : 'radio';
        입력.name = '문제' + idx;
        입력.value = i;
        입력.className = '보기입력';

        라벨.append(입력, 요소('span', '보기마커', 동그라미[i]), 요소('span', '보기글', 글));
        보기목록.appendChild(라벨);
        보기라벨들.push(라벨);

        입력.addEventListener('change', () => {
          if (다중) {
            라벨.classList.toggle('선택됨', 입력.checked);
          } else {
            보기라벨들.forEach(l => l.classList.remove('선택됨'));
            라벨.classList.add('선택됨');
          }
          const 선택있음 = 보기라벨들.some(l => l.querySelector('input').checked);
          제출버튼.classList.toggle('표시', 선택있음);
          if (선택있음) requestAnimationFrame(() => 제출버튼.classList.add('보임'));
        });
      });
      카드.appendChild(보기목록);

      const 결과 = 요소('div', '결과영역');
      결과.hidden = true;
      const 배지 = 요소('span', '결과배지');
      const 정답줄 = 요소('p', '정답줄');
      const 해설칸 = 요소('div', '해설');
      const 해설글 = 요소('p', '', 문제.해설);
      해설글.style.margin = '0';
      해설칸.append(요소('b', '', '해설'), 해설글);
      const 담기버튼 = 요소('button', '담기버튼');
      담기버튼.type = 'button';
      결과.append(배지, 정답줄, 해설칸, 담기버튼);
      카드.appendChild(결과);

      let 내선택 = null;   /* 숫자 하나, 여러 개를 고르는 문제면 숫자 배열 */
      let 내맞음 = false;

      function 담기갱신() {
        const 담김 = !!노트찾기(열쇠);
        담기버튼.classList.toggle('담김', 담김);
        담기버튼.textContent = 담김 ? '오답노트에 담김 · 누르면 빼기' : '헷갈려요 · 오답노트에 담기';
      }

      담기버튼.onclick = () => {
        if (노트찾기(열쇠)) 노트빼기(열쇠);
        else 노트넣기(열쇠, 내선택, 내맞음);
        담기갱신();
      };

      제출버튼.addEventListener('click', () => {
        const 고른것 = [];
        보기라벨들.forEach((l, i) => { if (l.querySelector('input').checked) 고른것.push(i); });
        if (!고른것.length) return;

        const 정답 = 정답목록(문제);
        내선택 = 다중 ? 고른것 : 고른것[0];
        내맞음 = 같은목록(고른것, 정답);

        보기라벨들.forEach((l, i) => {
          l.querySelector('input').disabled = true;
          if (정답.includes(i)) l.classList.add('정답');
          else if (고른것.includes(i)) l.classList.add('오답선택');
        });
        보기목록.classList.add('잠김');

        배지.textContent = 내맞음 ? '정답이에요' : '아쉬워요, 오답이에요';
        배지.className = '결과배지 ' + (내맞음 ? '맞음' : '틀림');
        정답줄.innerHTML = '정답은 ' + 정답.map(v => '<b>' + 동그라미[v] + '번</b>').join(', ') + '이에요.';
        결과.hidden = false;
        제출버튼.remove();

        /* 틀린 문제는 자동으로 담고, 맞힌 문제는 학생이 '헷갈려요'를 눌렀을 때만 담습니다 */
        if (!내맞음) 노트넣기(열쇠, 내선택, false);
        else if (노트찾기(열쇠)) 노트넣기(열쇠, 내선택, true);
        담기갱신();

        if (!제출됨[idx]) {
          제출됨[idx] = true;
          if (내맞음) 정답수++;
          요약갱신();
        }
      });

      return 카드;
    }

    function 카테고리선택(key) {
      현재카테고리 = key;
      카테고리풀 = 셔플(분류문제(key));
      표시개수 = Math.min(한번에, 카테고리풀.length);
      제출됨 = new Array(표시개수).fill(false);
      정답수 = 0;

      카테고리바그리기();
      const 목록칸 = $('#문제목록');
      목록칸.innerHTML = '';
      for (let i = 0; i < 표시개수; i++) 목록칸.appendChild(문제카드만들기(카테고리풀[i], i));
      요약갱신();
      scrollTo({ top: 0, behavior: 'smooth' });
    }

    function 문제더풀기() {
      const 새표시개수 = Math.min(표시개수 + 한번에, 카테고리풀.length);
      const 목록칸 = $('#문제목록');
      for (let i = 표시개수; i < 새표시개수; i++) {
        제출됨.push(false);
        목록칸.appendChild(문제카드만들기(카테고리풀[i], i));
      }
      표시개수 = 새표시개수;
      요약갱신();
    }

    function 요약갱신() {
      const 제출수 = 제출됨.filter(Boolean).length;
      $('#요약').innerHTML = '제출 <b>' + 제출수 + '</b> / ' + 표시개수 +
        (제출수 ? '  ·  정답 <b>' + 정답수 + '</b>개' : '');
      $('#다시풀기').hidden = 제출수 === 0;
      $('#문제더풀기').hidden = !(제출수 === 표시개수 && 표시개수 < 카테고리풀.length);
    }

    /* ── 오답노트 화면 ── */
    function 노트카드만들기(문제, 항목, 번호) {
      const 정답 = 정답목록(문제);
      const 고른들 = 고른목록(항목.c);

      const 카드 = 요소('div', '노트카드');
      const 분류 = 분류있음 ? 카테고리목록.find(c => c.key === 문제.카테고리) : null;
      if (분류) 카드.appendChild(요소('span', '분류', 분류.label));

      const 머리 = 요소('div', '문제머리');
      머리.append(요소('span', '번호', String(번호)), 요소('div', '지문', 문제.지문));
      카드.appendChild(머리);

      const 박스 = 설명박스만들기(문제);
      if (박스) 카드.appendChild(박스);
      const 지도 = 지도만들기(문제, true);
      if (지도) 카드.appendChild(지도);

      const 목록 = 요소('div', '보기목록');
      문제.보기.forEach((글, i) => {
        const 행 = 요소('div', '보기');
        if (정답.includes(i)) 행.classList.add('정답');
        else if (고른들.includes(i)) 행.classList.add('오답선택');
        행.append(요소('span', '보기마커', 동그라미[i]), 요소('span', '보기글', 글));
        const 표시 = [];
        if (고른들.includes(i)) 표시.push('내가 고른 답');
        if (정답.includes(i)) 표시.push('정답');
        if (표시.length) 행.appendChild(요소('span', '보기표시', 표시.join(' · ')));
        목록.appendChild(행);
      });
      카드.appendChild(목록);

      const 결과 = 요소('div', '결과영역');
      const 고른글 = 고른들.length ? 고른들.map(v => 동그라미[v] + '번').join('·') : '?';
      const 정답글 = 정답.map(v => 동그라미[v] + '번').join('·');
      const 줄 = 요소('p', '정답줄');
      줄.textContent = 같은목록(고른들, 정답)
        ? '내가 고른 답은 ' + 고른글 + '이고, 정답이에요. 헷갈려서 담아 둔 문제예요.'
        : '내가 고른 답은 ' + 고른글 + ', 정답은 ' + 정답글 + '이에요.';
      const 해설칸 = 요소('div', '해설');
      const 해설글 = 요소('p', '', 문제.해설);
      해설글.style.margin = '0';
      해설칸.append(요소('b', '', '해설'), 해설글);
      결과.append(줄, 해설칸);
      카드.appendChild(결과);

      const 빼기 = 요소('button', '빼기버튼', '오답노트에서 빼기');
      빼기.type = 'button';
      빼기.onclick = () => { 노트빼기(항목.k); 노트그리기(); };
      카드.appendChild(빼기);

      return 카드;
    }

    function 노트그리기() {
      const 칸 = $('#노트목록');
      칸.innerHTML = '';

      const 항목들 = 노트
        .map(e => ({ e, 정보: 열쇠맵.get(e.k) }))
        .filter(x => x.정보)
        .sort((a, b) => a.정보.정렬 - b.정보.정렬);

      $('#노트개수글').textContent = 항목들.length ? '· ' + 항목들.length + '문제' : '';
      $('.인쇄제목 b').textContent = (단원명 ? 단원명 + ' · ' : '') + '오답노트';
      $('.인쇄제목 span').textContent = 오늘글() + ' · ' + 항목들.length + '문제';
      $('.노트도구').hidden = !항목들.length;

      if (!항목들.length) {
        const 빈 = 요소('div', '노트빈');
        빈.innerHTML = '아직 담아 둔 문제가 없어요.<br>문제를 풀다가 틀리거나 헷갈리면 여기에 모여요.';
        칸.appendChild(빈);
        return;
      }
      항목들.forEach((x, i) => 칸.appendChild(노트카드만들기(x.정보.문제, x.e, i + 1)));
    }

    function 화면바꾸기(이름) {
      const 노트중 = 이름 === '노트';
      $('#풀이화면').hidden = 노트중;
      $('#노트화면').hidden = !노트중;
      document.body.classList.toggle('노트보기', 노트중);
      루트.querySelectorAll('.화면탭버튼').forEach(b => b.classList.toggle('활성', b.dataset.화면 === 이름));
      if (노트중) 노트그리기();
      scrollTo({ top: 0 });
    }

    async function 노트인쇄() {
      /* 그림이 다 불러와진 뒤에 인쇄 창을 엽니다. 저장되는 파일 이름은 페이지 제목을 따라갑니다. */
      const 그림들 = [...루트.querySelectorAll('#노트목록 img')];
      await Promise.all(그림들.map(im => im.complete ? null : new Promise(r => { im.onload = im.onerror = r; })));
      const 원래제목 = document.title;
      document.title = (단원명 ? 단원명 + ' ' : '') + '오답노트';
      window.addEventListener('afterprint', () => { document.title = 원래제목; }, { once: true });
      window.print();
    }

    루트.querySelectorAll('.화면탭버튼').forEach(b => { b.onclick = () => 화면바꾸기(b.dataset.화면); });
    $('#다시풀기').onclick = () => 카테고리선택(현재카테고리);
    $('#문제더풀기').onclick = 문제더풀기;
    $('#노트저장').onclick = 노트인쇄;
    $('#노트비우기').onclick = () => {
      if (!confirm('이 단원의 오답노트를 모두 비울까요?')) return;
      노트 = [];
      노트저장();
      노트그리기();
    };

    노트수갱신();
    카테고리선택(현재카테고리);
  };
})();
