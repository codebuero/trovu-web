import Env from './Env.js';
import Logger from './Logger';
import NamespaceFetcher from './NamespaceFetcher.js';
import jsyaml from 'js-yaml';

function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj));
}

let env;

beforeEach(() => {
  const logger = new Logger();
  env = new Env(null, logger);
});

describe('NamespaceFetcher.getInitialNamespaceInfo', () => {
  test('site', () => {
    expect(new NamespaceFetcher(env).getInitalNamespaceInfo('de')).toEqual({
      name: 'de'
    });
  });
  test('github', () => {
    expect(new NamespaceFetcher(env).getInitalNamespaceInfo('johndoe')).toEqual(
      {
        name: 'johndoe'
      }
    );
  });
});

describe('NamespaceFetcher.addNamespaceInfo', () => {
  test('site', () => {
    expect(
      new NamespaceFetcher(env).addNamespaceInfo({
        name: 'de',
        shortcuts: true
      })
    ).toEqual({
      name: 'de',
      shortcuts: true,
      type: 'site'
    });
  });
  test('github', () => {
    expect(
      new NamespaceFetcher(env).addNamespaceInfo({ name: 'johndoe' })
    ).toEqual({
      github: 'johndoe',
      name: 'johndoe',
      type: 'user',
      url: `https://raw.githubusercontent.com/johndoe/trovu-data-user/master/shortcuts.yml?${env.commitHash}`
    });
  });
});

describe('NamespaceFetcher.processInclude', () => {
  const namespaceInfos = jsyaml.load(`
    leo:
      shortcuts:
        de-fr 1:
          url: https://dict.leo.org/französisch-deutsch/{%word}
          title: Allemand-Français (leo.org)
        fr-de 1:
          title: Französisch-Deutsch (leo.org)
          include:
            key: de-fr 1
  `);

  test('1 level', () => {
    const shortcut = jsyaml.load(`
    include:
      key: de-fr 1
    `);
    expect(
      new NamespaceFetcher(env).processInclude(
        shortcut,
        'leo',
        cloneObject(namespaceInfos)
      )
    ).toMatchObject({
      url: 'https://dict.leo.org/französisch-deutsch/{%word}',
      title: 'Allemand-Français (leo.org)'
    });
  });

  test('2 level', () => {
    const shortcut = jsyaml.load(`
    include:
      key: fr-de 1
      namespace: leo
  `);
    expect(
      new NamespaceFetcher(env).processInclude(
        shortcut,
        '',
        cloneObject(namespaceInfos)
      )
    ).toMatchObject({
      url: 'https://dict.leo.org/französisch-deutsch/{%word}',
      title: 'Französisch-Deutsch (leo.org)'
    });
  });

  test('with variable', () => {
    const shortcut = jsyaml.load(`
    include:
      key: fr-{$language} 1
    `);
    expect(
      new NamespaceFetcher(new Env({ language: 'de' }, new Logger())).processInclude(
        shortcut,
        'leo',
        cloneObject(namespaceInfos)
      )
    ).toMatchObject({
      url: 'https://dict.leo.org/französisch-deutsch/{%word}',
      title: 'Französisch-Deutsch (leo.org)'
    });
  });

  test('with loop', () => {
    const namespaceInfosLoop = jsyaml.load(`
      leo:
        shortcuts:
          tic 1:
            include:
              key: tac 1
          tac 1:
            include:
              key: toe 1
          toe 1:
            include:
              key: tic 1
    `);
    const shortcut = jsyaml.load(`
    include:
      key: tic 1
    `);
    expect(() => {
      new NamespaceFetcher(new Env({}, new Logger())).processInclude(
        shortcut,
        'leo',
        namespaceInfosLoop
      );
    }).toThrow(Error);
  });

  test('multiple', () => {
    const namespaceInfosMultiple = jsyaml.load(`
      leo:
        shortcuts:
          de-fr 1:
            url: https://dict.leo.org/französisch-deutsch/{%word}
            title: Allemand-Français (leo.org)
          fr-de 1:
            title: Französisch-Deutsch (leo.org)
            include:
              key: de-fr 1
          fr 1:
            include:
              key: fr-{$language} 1
    `);
    const shortcut = jsyaml.load(`
    include:
    - key: fr 1
      namespace: lge
    - key: fr 1
      namespace: leo
    `);
    expect(
      new NamespaceFetcher(new Env({ language: 'de' }, new Logger())).processInclude(
        shortcut,
        'o',
        namespaceInfosMultiple
      )
    ).toMatchObject({
      title: 'Französisch-Deutsch (leo.org)',
      url: 'https://dict.leo.org/französisch-deutsch/{%word}'
    });
  });
});

describe('NamespaceFetcher.addReachable', () => {
  const namespaceInfos = jsyaml.load(`
    o:
      priority: 1
      shortcuts:
        eo 1:
          title: Esperanto dictionary
    de:
      priority: 2
      shortcuts:
        eo 1:
          title: Esperanto-Wörterbuch
  `);

  test('standard', () => {
    expect(
      new NamespaceFetcher(new Env({}, new Logger())).addReachable(namespaceInfos)
    ).toEqual(
      jsyaml.load(`
        o:
          priority: 1
          shortcuts:
            eo 1:
              title: Esperanto dictionary
              reachable: false
        de:
          priority: 2
          shortcuts:
            eo 1:
              title: Esperanto-Wörterbuch
              reachable: true
      `)
    );
  });
});

describe('NamespaceFetcher.addInfo', () => {
  test('standard', () => {
    expect(
      new NamespaceFetcher(new Env({}, new Logger())).addInfo(
        {
          url: 'https://reiseauskunft.bahn.de/bin/query.exe/d?S={%Start}&Z={%Ziel}&timesel=depart&start=1'
        },
        'db 2',
        '.de'
      )
    ).toEqual(
      jsyaml.load(`
        url: https://reiseauskunft.bahn.de/bin/query.exe/d?S={%Start}&Z={%Ziel}&timesel=depart&start=1
        key: db 2
        keyword: db
        argumentCount: 2
        namespace: .de
        arguments:
          Start:
            '{%Start}': {}
          Ziel:
            '{%Ziel}': {}
        title: '' 
    `)
    );
  });
});
