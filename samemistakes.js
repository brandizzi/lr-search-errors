// ==UserScript==
// @name        Is this a new error?
// @namespace   brandizzi
// @include     https://github.com/*/liferay-portal/pull/*
// @version     1
// @grant       none
// ==/UserScript==
function getFailureComments() {
  var comments = [];
  var result = document.evaluate('//h1[text()="Some tests FAILED!"]', document, null, null, null);
  var item = result.iterateNext();

  
  while (item) {
    comments.push(item.parentNode);

    item = result.iterateNext();
  }

  return comments;
}

function getFailedTestsLinks(commentElement) {
  var tests = [];
  var links = commentElement.getElementsByTagName('a');

  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    var url = link.href;
    var tokenIndex = url.indexOf('testReport');

    if ((tokenIndex > - 1) && (url.slice(tokenIndex).length > 15)) {
      tests.push(link);
    }
  }

  return tests;
}

var errorCache = {};

function searchError(failedTest, callback) {
  if (errorCache[failedTest]) {
    callback(errorCache[failedTest]);
    return;
  }

  var searchURL = 'https://api.github.com/search/issues?' +
  'q=user:brianchandotcom+repo:liferay-portal' +
  '+' + failedTest;
  var xhr = new XMLHttpRequest();

  xhr.onload = function () {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        var response = JSON.parse(xhr.responseText);

        callback(response);

        errorCache[failedTest] = response;
      } else {
        callback(xhr.statusText);
      }
    }
  }

  xhr.open('GET', searchURL, true);
  xhr.send();
}

var icons = {
  accepted: {
    alt: 'Pull requests with this error were merged.',
    img:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf' +
      '8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAB/klEQVQ4jWNgoBfwbZASCemQ8UQXZy' +
      'bWgPhsp1UORrbVJp5yTmKmn09f3vXxNQMDAwMTMZoju6Wd5KVkHL/9ecqmJC/i' +
      'KC+qmgeTYyHGAAMly8a/DO+4/vz5zfD2y4/nF+5faoDJEXRBfJdynKSYkPmPn1' +
      '8Z2Bj5GO48vr1qW8PrF0S5IDSUgVlX1bjw648XrP/+/2V49+3v3RuPDlUhq0F2' +
      'AWPpfMclaZP16mECAvb6JYL8nPo/f39nYGcW+n/14ZU5mxsYviEbAHdB/kzLPm' +
      'Up8QgGBul/JfMEtU7cupChJqWR+v7zY0YmRiaGN19+XHp/4Hw3uivhBojyiXt9' +
      '/v6a+c/fn8zy4iJh/FzOFlwcf+U+ff/FwMch/fv8/bO9q1cz/EU3AJ4OBIw+HR' +
      'PnV7ZjY2ES/fL9DQMD42f+778+MTAxsjJ8+sp4fFLmiQJs4QQ34Pq+z88ZVZ+u' +
      'EOSWsuTn4pP/8esTw79//xi42aW/nrp5PP3G/q/38RrAwMDAcP/Ir+8shvcWs/' +
      '8TUhbll9T4++8X87tPv/fMLbzSjk0zugHMDAwMXA8OMPCc2vZkv5AaI7Mgv4zs' +
      '5tVHql/d+f2HgYGBi4GBgY0BEnP/GBgY/jMwMDAwohnAAcXsUMUwC/4yMDD8Ym' +
      'Bg+MnAwPADiv+iG4AMGJEwA9Q2GEYBANyLsiYQi6lLAAAAAElFTkSuQmCC'
  },
  known: {
    alt: 'This error was found in other pull requests.',
    img:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf' +
      '8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH2gQOEx8eQxtqzgAAAhNJRE' +
      'FUOI2l0k1LVGEUwPH/fRnvnbmvM+M46cy1Ri0JQaJFhkiQm4KojdgyMVCiXR+g' +
      'RSRUQqugZcu+QAS1qVW0qZUpKVSipI75NjGpV2fuaWMGOVNCZ3ee5zy/58A58J' +
      '+h1Lt4N0qiJdf5WqBhdXq6v/sp67Xq1HpA2smOefGdM76xdcrNZx/Uq6sJTA6S' +
      'cnPBIOtfoDSHk266MjFMcGjA6gjGzZ1iXjHjKAmLeKWY9Zpa7h8KmBgmsNOZy5' +
      'Tm0YMCemsbUl7GSboXP16j+5+A19w2ngi/Nim2Q5hIE5o+qutjhIupRC5396/A' +
      '5BBdTtK5IOUier7AoxffePhsGT0oIGEJ1zb6p4Y4VxfwCsfvGVvzSdVLoro+rY' +
      '0NNCdjKJaDmmwkFi7abj64XROYGKHXss3zsr2Gni8A0JqJ0ezrAOhBASrbuKb0' +
      'zYxoAweAdHDyjlGetdVUBsWyAWjPGnTmTAAUI46WOYIWFk0rk70le0uoAkyNap' +
      'esuNInO2X03LH99h6/XOHJq9X9XMsdBanimpWe6Zux67CnLIx1vfHCT72a76O3' +
      'ndh/EAmICJr6e+Mrc5+pFhfYkMz7mbfFs/rzqwwkGio9/NimurJEdWXpz0lROX' +
      'ACnrl7OtbCDX12lbn2jWgppndYEkUKIohEIAISIQhEVRREJIoAQSGS3U3ZnP/O' +
      'h1+9qUAKMGp8VitCYA2IfgKfvKixlRhauwAAAABJRU5ErkJggg=='
  },
  unknown: {
    alt: 'This error only happened in this pull request.',
    img:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf' +
      '8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH2QsbDSouskhUfAAAAjJJRE' +
      'FUOI11kz9oU0Ecxz/37r3k5U+bEqNWWkIVY4uLitBJ3XURHYJDEcSho1Dq5qbg' +
      '4OgqFApWKB2KIEI3cROLBYdK62AjdEjaxCbU5vXe3Tm8NH1p6xe+HL/7/e573/' +
      'v9OMEJmINC1vMm0oXCiACatdpvFYazZagdrRXxYAYGisPDrwcGB2+nE4lTaA3W' +
      'guuyFwSNZq32oVqpPClD/ZjAPFwsjo0t9CWTV2wQgOMgRJS21oIxiESCllLfK6' +
      'ur98vwsyswA/5oqfSp3/PG0RqEiAQcJxIwBoyJ3EhJKwyXf6yt3XgEbQdgOJd7' +
      'lstkxq1SUdEBrD0WW6XoS6WuD+bzzwEcgGyxeNc0m4fFHcu2wx4ha7GtFvmhoT' +
      'sA7jsYSVpbsvFbY7BxJ9ZykPWEKL2FkivhgrA2aazlzOQk56anT5psFxtTUzQW' +
      'F3GE8BJw2VVQ10oZB5w/S0u0NzZAiO4EDo1FDv6urGAAHQQoqIp5SBUKhfVkoz' +
      'GElAgpEa4b0fOiVcpIQGt0EGB2d1G53GalWr3klmHvozFfPCHu2f39/1qPd0a4' +
      'LnvGLD+EXQdgp15/qdLpugGOUnfYs5fNNlpbWy8AJMACbN7S2u33/ZsoJW2n0J' +
      '5Ak8moShC8mtB6risAyPfGbJ/V2smnUqM++NaYnoMikWDH95uf2+3Zp2E4A2wD' +
      'Nt5qCZy/CtceuO7j01KWUkL0WxAB7FTDcH0hDN98hW/Ar87Len/jEciYw4NWHM' +
      'M/YUQP6KTcLoIAAAAASUVORK5CYII='
  },
  searchFail: {
    alt: 'Search failed :(',
    img:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf' +
      '8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAB4UlEQVQ4jYWTPWzTQBTH350dx3EDIh' +
      'UBARZfQ5uh4UN8VSxUDDDAgMQMAwOiLEyMlSxV7VYxIcTOwMLCBK1UsYEoijK0' +
      'NITG1HFwlDS1cL5cn31nlg6WP9In3XL6/X96eu8OQVIpCpa/Hj6CecevX3MsUB' +
      'QWh6G44N3diaXJiTNPfYQlShkD6tpqrf7q0+vHc2GcC1/cvzr7tlAozG5qHb/R' +
      'aH8n3Nhxc0/InJWPTkvytKiVPq4GeRwWnD554lGlaWOew7ha0++woTmgnguayY' +
      'RTsvwizEcEjDEfIQBJTCER9o6lgPU8YgN1HbBdTzxQUFmvPsmy3fqOsf1Ou0k1' +
      'PgV5j9iAGGGDXl8N89EhBqr4cPHBlcsX3v9p97k0eOTnr62Ljc/KVpDhRwmmJs' +
      '8v6c2OQIeD1vpf47qxvKCHmURBfkbJAsbnrM7OhjEc3DCWF4ZxXKIgJbg5lzio' +
      'bXafGSvzseGRAgqOuVaqvCQOqyYxAAlDzM8o2Xu3L+k8x2V63X+wVtouqitzv+' +
      'PYyBoBACREbuF0NrNp2GnL5bnxcfF5UgexAmLV1J5l4UNjIiBKfV0tfwOAHAAI' +
      'YTbyFwCA7zc3SKvT/eG7RKqVV9+0yh++AADbPyQIj3pIaL9DFAhH6j8Bb85b5o' +
      'ncewAAAABJRU5ErkJggg=='
  }
}

function getImg(icon) {
  var img = document.createElement('img');

  img.src = icon.img;
  img.alt = icon.alt;
  img.title = icon.alt;

  return img;
}

function markLink(link) {
  var error = link.textContent;

  searchError(error, function (result) {
    var img;

    if (!result.hasOwnProperty('items')) {
      img = getImg(icons.searchFail);
    } else if (result.total_count <= 1) {
      img = getImg(icons.unknown);
    } else {
      img = getImg(icons.known);
    }

    link.parentNode.insertBefore(img, link.nextSibling);
  });
}

function main() {
  var comments = getFailureComments();

  comments.forEach(function(comment) {
    var links = getFailedTestsLinks(comment);

    links.forEach(function (link) {
      markLink(link);
    });
  });
}

main();
