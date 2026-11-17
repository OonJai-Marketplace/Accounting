// Exercise the shipped controllers and both journal routes with a simulated iPad viewport.
const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

async function exercise(page, keyboardOpen) {
  return page.evaluate(async open => {
    const editor = document.querySelector('#jeGeneralMemo').parentElement.querySelector('[contenteditable="true"]');
    const host = editor.closest('.workspace-scroll');
    const selection = getSelection();
    const viewport = visualViewport;
    const settle = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const word = () => {
      const range = document.createRange();
      range.setStart(editor.firstChild, 5);
      range.setEnd(editor.firstChild, 12);
      selection.removeAllRanges();
      selection.addRange(range);
    };
    const finger = (type, x, y, time) => {
      const event = new Event(type, {bubbles:true, cancelable:true});
      const point = {clientX:x, clientY:y};
      Object.defineProperties(event, {
        touches:{value:type === 'touchend' ? [] : [point]},
        changedTouches:{value:[point]}, timeStamp:{value:time}
      });
      host.dispatchEvent(event);
      return event.defaultPrevented;
    };

    document.getElementById('jeGeneralMemo').value = 'Copy receipt details';
    editor.focus();
    const normalHeight = viewport.height;
    Object.defineProperty(viewport, 'height', {configurable:true, value:open ? normalHeight - 320 : normalHeight});
    viewport.dispatchEvent(new Event('resize'));
    await settle();
    const keyboard = tabletViewport132.state.keyboard;

    // Put the active field outside the visible area, just as it can be when
    // panning a zoomed page. Count only scroll corrections initiated by the app.
    let corrections = 0;
    host.scrollBy = () => { corrections++; };
    editor.getBoundingClientRect = () => ({top:normalHeight+100,bottom:normalHeight+140,height:40});
    host.scrollTop = 0;
    word();
    const mainHeight = document.documentElement.style.getPropertyValue('--tablet-main-height285');
    for (const offset of [20, 60, 100]) {
      Object.defineProperty(viewport, 'offsetTop', {configurable:true, value:offset});
      viewport.dispatchEvent(new Event('scroll'));
      await settle();
    }
    const steadyHeight = mainHeight === document.documentElement.style.getPropertyValue('--tablet-main-height285');
    const clipboard = new DataTransfer();
    editor.dispatchEvent(new ClipboardEvent('copy', {bubbles:true,cancelable:true,clipboardData:clipboard}));
    const copied = clipboard.getData('text/plain');

    // Also cover the time between touchstart and iPadOS exposing the new range.
    selection.collapseToEnd();
    finger('touchstart', 20, 20, 1);
    word();
    const selectionClaimed = finger('touchmove', 23, 125, 170);
    finger('touchend', 23, 125, 200);
    selection.collapseToEnd();
    finger('touchstart', 20, 20, 1000);
    const holdClaimed = finger('touchmove', 23, 130, 1520);
    finger('touchend', 23, 130, 1530);
    finger('touchstart', 20, 20, 2000);
    const diagonalClaimed = finger('touchmove', 60, 62, 2050);
    finger('touchend', 60, 62, 2100);
    finger('touchstart', 20, 20, 3000);
    const verticalClaimed = finger('touchmove', 20, 65, 3080);
    finger('touchend', 20, 65, 3100);

    // A plain viewport pan must also leave a collapsed caret alone.
    viewport.dispatchEvent(new Event('scroll'));
    await settle();
    delete host.scrollBy;
    delete editor.getBoundingClientRect;
    delete viewport.height;
    delete viewport.offsetTop;
    viewport.dispatchEvent(new Event('resize'));
    editor.blur();
    await settle();
    return {keyboard, copied, corrections, steadyHeight, selectionClaimed, holdClaimed, diagonalClaimed, verticalClaimed};
  }, keyboardOpen);
}

(async () => {
  process.env.PHASE0_DEVICE = 'tablet';
  for (const role of ['admin', 'submitter']) {
    const fixture = await createFixture();
    try {
      const {page, login} = await fixture.open('desktop', role);
      await login();
      await page.evaluate(role => {
        if (role === 'submitter') {
          openWorkspaceUser(liveProfile.id);
          personalJournal1437.show(liveProfile.id, 'journal');
        } else {
          switchTab('journal');
        }
        showJournalEntry98(true, false);
      }, role);
      for (const open of [false, true]) {
        const result = await exercise(page, open);
        assert.deepEqual(result, {keyboard:open, copied:'receipt', corrections:0, steadyHeight:true,
          selectionClaimed:false, holdClaimed:false, diagonalClaimed:false, verticalClaimed:!open});
        console.log('PASS', role, open ? 'keyboard open' : 'keyboard closed');
      }
    } finally {
      await fixture.close();
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
