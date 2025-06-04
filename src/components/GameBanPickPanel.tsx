import { useState, useEffect, useMemo, useCallback } from 'react';
import HeroList from './HeroList'; // Asegúrate de que HeroList exporte un array de objetos Hero

// Type definitions (estas están perfectas)
interface Hero {
  id: number;
  chineseName: string;
  englishName: string;
  occupation: string;
  altOccupation?: string;
  combo?: number[];
  counter?: number[];
  beCountered?: number[];
}

interface Role {
  id: string;
  name: string;
  englishName: string;
}

interface Phase {
  team: 'blue' | 'red';
  action: 'ban' | 'pick';
  text: string;
}

interface SelectedHeroes {
  blueBans: number[];
  redBans: number[];
  bluePicks: number[];
  redPicks: number[];
}

interface HistoryState {
  selectedHeroes: SelectedHeroes;
  currentPhase: number;
}

interface Recommendations {
  combos: number[];
  counters: number[];
  beCountered: number[];
  enemyBeCountered: number[];
}

const GameBanPickPanel = ({ phases }: { phases: Phase[] }) => {
  const [language, setLanguage] = useState<'eng' | 'zh'>('eng');
  const [userTeam, setUserTeam] = useState<'blue' | 'red'>('blue');
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedHeroes, setSelectedHeroes] = useState<SelectedHeroes>({
    blueBans: [],
    redBans: [],
    bluePicks: [],
    redPicks: [],
  });
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [resetCounter, setResetCounter] = useState(0);

  const roles: Role[] = [
    { id: 'Jungla', name: '打野', englishName: 'Jungla' },
    { id: 'Top', name: '对抗路', englishName: 'Top' },
    { id: 'Mid', name: '中路', englishName: 'Mid' },
    { id: 'Support', name: '游走', englishName: 'Support' },
    { id: 'ADC', name: '发育路', englishName: 'ADC' },
  ];

  const handleLanguage = () => {
    setLanguage(prevLanguage => (prevLanguage === 'eng' ? 'zh' : 'eng'));
  };

  useEffect(() => {
    if (currentPhase < phases.length) {
      setUserTeam(phases[currentPhase].team);
    }
  }, [currentPhase, phases]); // Añadir 'phases' a las dependencias de useEffect

  const handleChampionClick = (championId: number): void => {
    if (currentPhase >= phases.length) return;

    const currentAction = phases[currentPhase];
    const { team, action } = currentAction;

    setHistory(prev => [...prev, {
      selectedHeroes: { ...selectedHeroes },
      currentPhase
    }]);

    setSelectedHeroes(prev => {
      const key = `${team}${action === 'ban' ? 'Bans' : 'Picks'}` as keyof SelectedHeroes;
      return {
        ...prev,
        [key]: [...prev[key], championId]
      };
    });

    setCurrentPhase(prev => prev + 1);
  };

  const handleUndo = (): void => {
    if (history.length === 0) return;

    const lastState = history[history.length - 1];
    setSelectedHeroes(lastState.selectedHeroes);
    setCurrentPhase(lastState.currentPhase);
    setHistory(prev => prev.slice(0, -1));
  };

  const resetDraft = (): void => {
    setCurrentPhase(0);
    setSelectedHeroes({
      blueBans: [],
      redBans: [],
      bluePicks: [],
      redPicks: [],
    });
    setSelectedRole('all');
    setHistory([]);
    setResetCounter(prev => prev + 1);
  };

  // Memoriza estas funciones para que no se re-creen en cada render
  const getHeroById = useCallback((id: number): Hero | undefined =>
    HeroList.find(hero => hero.id === id),
    []
  );

  const getTeamPicks = useCallback((team: 'blue' | 'red'): number[] => {
    return team === 'blue' ? selectedHeroes.bluePicks : selectedHeroes.redPicks;
  }, [selectedHeroes]);

  // Usa useMemo para calcular las recomendaciones una sola vez por render
  const recommendations = useMemo(() => {
    const currentTeamPicks = getTeamPicks(userTeam);
    const enemyTeamPicks = getTeamPicks(userTeam === 'blue' ? 'red' : 'blue');
    const bannedHeroes = [
      ...selectedHeroes.blueBans,
      ...selectedHeroes.redBans
    ];

    if (currentTeamPicks.length === 0 && enemyTeamPicks.length === 0) {
      return {
        combos: [],
        counters: [],
        beCountered: [],
        enemyBeCountered: []
      };
    }

    const recs: Recommendations = {
      combos: [],
      counters: [],
      beCountered: [],
      enemyBeCountered: []
    };

    const addedCombos = new Set<number>();
    const addedCounters = new Set<number>();
    const addedBeCountered = new Set<number>();
    const addedEnemyBeCountered = new Set<number>();

    currentTeamPicks.forEach(heroId => {
      const hero = getHeroById(heroId);
      if (hero) {
        if (hero.combo) {
          hero.combo.forEach(id => {
            if (!bannedHeroes.includes(id) && !addedCombos.has(id)) {
              recs.combos.push(id);
              addedCombos.add(id);
            }
          });
        }
        if (hero.counter) {
          hero.counter.forEach(id => {
            if (!bannedHeroes.includes(id) && !addedCounters.has(id)) {
              recs.counters.push(id);
              addedCounters.add(id);
            }
          });
        }
        if (hero.beCountered) {
          hero.beCountered.forEach(id => {
            if (!bannedHeroes.includes(id) && !addedBeCountered.has(id)) {
              recs.beCountered.push(id);
              addedBeCountered.add(id);
            }
          });
        }
      }
    });

    enemyTeamPicks.forEach(heroId => {
      const hero = getHeroById(heroId);
      if (hero && hero.beCountered) {
        hero.beCountered.forEach(id => {
          if (!bannedHeroes.includes(id) && !addedEnemyBeCountered.has(id)) {
            recs.enemyBeCountered.push(id);
            addedEnemyBeCountered.add(id);
          }
        });
      }
    });

    return recs;
  }, [selectedHeroes, userTeam, getHeroById, getTeamPicks]);


  const isChampionSelected = (championId: number): boolean => {
    const allSelected = [
      ...selectedHeroes.blueBans,
      ...selectedHeroes.redBans,
      ...selectedHeroes.bluePicks,
      ...selectedHeroes.redPicks,
    ];
    return allSelected.includes(championId);
  };

  const getCurrentActionText = (): string => {
    if (currentPhase >= phases.length) return 'Draft Complete';
    return phases[currentPhase].text;
  };

  const isUserTurn = (): boolean => {
    if (currentPhase >= phases.length) return false;
    return phases[currentPhase].team === userTeam;
  };

  const getBackgroundColor = (): string => {
    if (currentPhase >= phases.length) return 'from-gray-900 to-gray-800';
    return phases[currentPhase].team === 'blue'
      ? 'from-blue-900/50 to-blue-800/50'
      : 'from-red-900/50 to-red-800/50';
  };

  // Puedes usar useMemo aquí también si HeroList es grande y selectedRole cambia a menudo
  const filteredHeroes = useMemo(() => {
    return HeroList.filter(item =>
      selectedRole === 'all' || item.occupation === selectedRole || item.altOccupation === selectedRole
    );
  }, [selectedRole, HeroList]); // HeroList as a dependency if it could change, otherwise omit

  const getRecommendationSources = useCallback((heroId: number, currentTeamPicks: number[]): string[] => {
    return currentTeamPicks
      .map(pickId => {
        const hero = getHeroById(pickId);
        if (hero) {
          if (language === 'zh') {
            if (hero.combo && hero.combo.includes(heroId)) return hero.chineseName;
            if (hero.counter && hero.counter.includes(heroId)) return hero.chineseName;
            if (hero.beCountered && hero.beCountered.includes(heroId)) return hero.chineseName;
          } else { // language === 'eng'
            if (hero.combo && hero.combo.includes(heroId)) return hero.englishName;
            if (hero.counter && hero.counter.includes(heroId)) return hero.englishName;
            if (hero.beCountered && hero.beCountered.includes(heroId)) return hero.englishName;
          }
        }
        return null;
      })
      .filter((name): name is string => name !== null);
  }, [getHeroById, language]); // Depende de getHeroById y language


  return (
    <div className={`min-h-screen bg-gradient-to-b ${getBackgroundColor()} p-4 transition-all duration-500 w-[100vw] flex flex-row`} key={resetCounter}>
      <div className='w-[80%]'>
        {/* Header Controls */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUserTeam('blue')}
              className={`px-4 py-2 rounded transition-colors duration-300 ${
                userTeam === 'blue' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {language === 'eng' ? 'Blue Team' : '蓝色方'}
            </button>
            <button
              onClick={() => setUserTeam('red')}
              className={`px-4 py-2 rounded transition-colors duration-300 ${
                userTeam === 'red' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {language === 'eng' ? 'Red Team' : '红色方'}
            </button>
          </div>
          <div className="text-white text-xl font-bold">
            {getCurrentActionText()}
          </div>
          <div className="flex gap-4">
            <button className={`px-4 py-2 rounded transition-colors duration-300 bg-blue-600`} onClick={handleLanguage}> <span className={`${language === 'eng' ? 'text-black' : 'text-gray-700'}`}>English</span> / <span className={`${language === 'zh' ? 'text-black' : 'text-gray-700'}`}>中文</span></button>

            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`px-4 py-2 rounded transition-colors duration-300 ${
                history.length > 0
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {language === 'eng' ? 'Undo' : '撤销'}
            </button>
            <button
              onClick={resetDraft}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors duration-300"
            >
              {language === 'eng' ? 'Reset Draft' : '重置'}
            </button>
          </div>
        </div>

        {/* Role Filter Buttons */}
        <div className="flex justify-center gap-4 mb-4">
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`px-4 py-2 rounded transition-colors duration-300 ${
                selectedRole === role.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {language === 'eng' ? role.englishName : role.name}
            </button>
          ))}
        </div>

        {/* Main Layout */}
        <div className="flex gap-4">
          {/* Blue Team Side Panel */}
          <div className="w-32 space-y-4">
            <div className="bg-blue-900/30 p-4 rounded">
              <h3 className="text-blue-400 font-bold mb-4">{language === 'eng' ? 'Blue Team' : '蓝方'}
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-red-500 font-bold mb-2">{language === 'eng' ? 'Bans' : '禁用'}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedHeroes.blueBans.map(id => {
                      const hero = getHeroById(id);
                      return hero && (
                        <div key={id} className="aspect-square bg-gray-700 rounded overflow-hidden opacity-50">
                          <img src={`/heroesImg/${hero.id}.png`}
                            alt={hero.englishName} className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-green-500 font-bold mb-2">{language === 'eng' ? 'Picks' : '选择'} </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedHeroes.bluePicks.map(id => {
                      const hero = getHeroById(id);
                      return hero && (
                        <div key={id} className="w-[48px] h-[48px] rounded-md border border-white shadow-sm">
                          <img src={`/heroesImg/${hero.id}.png`} alt={hero.englishName} className="w-full h-full object-cover" />
                        </div>)
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Champion Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-9 gap-1">
              {filteredHeroes.map(item => (
                <div
                  key={item.id}
                  onClick={() => { // Corrección del error de sintaxis aquí
                    if (!isChampionSelected(item.id) && isUserTurn()) {
                      handleChampionClick(item.id);
                    }
                  }}
                  className={`
            relative aspect-square w-[80px] overflow-hidden transition-all
            ${isChampionSelected(item.id)
                      ? 'opacity-50 cursor-not-allowed'
                      : isUserTurn()
                        ? 'cursor-pointer hover:ring-2 hover:ring-yellow-500 bg-gray-700/50'
                        : 'cursor-not-allowed bg-gray-900/50'
                    }
            `}
                >
                  <img
                    src={`/heroesImg/${item.id}.png`}
                    alt={item.chineseName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-white font-bold">
                        {language === 'eng' ? item.englishName : item.chineseName}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Current Phase Display */}
            <div className="mt-4 flex justify-center">
              <div className={`px-6 py-3 rounded-lg ${
                phases[currentPhase]?.team === 'blue' ? 'bg-blue-900/30' : 'bg-red-900/30'
              }`}>
                <span className="text-white font-bold">
                  {currentPhase >= phases.length
                    ? 'Draft Complete!'
                    : `${isUserTurn() ? 'Your' : 'Opponent\'s'} turn - ${getCurrentActionText()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Red Team Side Panel */}
          <div className="w-32 space-y-4">
            <div className="bg-red-900/30 p-4 rounded">
              <h3 className="text-red-400 font-bold mb-4">{language === 'eng' ? 'Red Team' : '红方'} </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-red-500 font-bold mb-2">{language === 'eng' ? 'Bans' : '禁用'} </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedHeroes.redBans.map(id => {
                      const hero = getHeroById(id);
                      return hero && (
                        <div key={id} className="aspect-square bg-gray-700 rounded overflow-hidden opacity-50">
                          <img src={`/heroesImg/${hero.id}.png`}
                            alt={hero.englishName} className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="text-green-500 font-bold mb-2">{language === 'eng' ? 'Picks' : '选择'} </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedHeroes.redPicks.map(id => {
                      const hero = getHeroById(id);
                      return hero && (
                        <div key={id} className="w-[48px] h-[48px] rounded-md border border-white shadow-sm">
                          <img src={`/heroesImg/${hero.id}.png`} alt={hero.englishName} className="w-full h-full object-cover" />
                        </div>)
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Recommendation Panel */}
      <div className="w-[260px] ml-auto mr-6 bg-gray-800/50 rounded-lg p-2">
        <h2 className="text-white font-bold text-xl mb-4">Recommendations</h2>
        {/* Condición mejorada para mostrar recomendaciones */}
        {recommendations.combos.length > 0 || recommendations.counters.length > 0 || recommendations.beCountered.length > 0 || recommendations.enemyBeCountered.length > 0 ? (
          <div className="space-y-6">
            {/* 新添加的对方英雄被克制部分 */}
            <div>
              <h3 className="text-purple-400 font-bold mb-2">{language === 'eng' ? `El enemigo es contrarrestado por` : '对方英雄被以下英雄克制'}</h3>
              <div className="grid grid-cols-3 gap-2">
                {recommendations.enemyBeCountered.map(heroId => {
                  const hero = getHeroById(heroId);
                  const enemyTeam = userTeam === 'blue' ? 'red' : 'blue';
                  // Usa la función memorizada
                  const sources = getRecommendationSources(heroId, getTeamPicks(enemyTeam));
                  return hero && (
                    <div key={heroId} className="flex flex-col items-center">
                      <div className="aspect-square w-[64px] bg-gray-700/50 rounded overflow-hidden">
                        <img
                          src={`/heroesImg/${hero.id}.png`}
                          alt={hero.englishName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-300 text-center">
                        <div>{language === 'eng' ? hero.englishName : hero.chineseName}</div>
                        <div className="text-purple-400">
                          {language === 'eng' ? `Counter: ${sources.join(', ')}` : `克制: ${sources.join(', ')}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-red-400 font-bold mb-2">{language === 'eng' ? 'Somos contrarrestados por' : '我方被以下英雄克制'}</h3>
              <div className="grid grid-cols-3 gap-2">
                {recommendations.beCountered.map(heroId => {
                  const hero = getHeroById(heroId);
                  // Usa la función memorizada
                  const sources = getRecommendationSources(heroId, getTeamPicks(userTeam));
                  return hero && (
                    <div key={heroId} className="flex flex-col items-center">
                      <div className="aspect-square w-[64px] bg-gray-700/50 rounded overflow-hidden">
                        <img
                          src={`/heroesImg/${hero.id}.png`}
                          alt={hero.englishName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-300 text-center">
                        {language === 'eng' ? <div>{hero.englishName}</div> : <div>{hero.chineseName}</div>}
                        <div className="text-red-400">
                          {language === 'eng' ? `Counter: ${sources.join(', ')}` : `克制: ${sources.join(', ')}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-green-400 font-bold mb-2">{language === 'eng' ? 'Combos y Sinergias' : '好配合'}</h3>
              <div className="grid grid-cols-3 gap-2">
                {recommendations.combos.map(heroId => {
                  const hero = getHeroById(heroId);
                  // Usa la función memorizada
                  const sources = getRecommendationSources(heroId, getTeamPicks(userTeam));
                  return hero && (
                    <div key={heroId} className="flex flex-col items-center">
                      <div className="aspect-square w-[64px] bg-gray-700/50 rounded overflow-hidden">
                        <img
                          src={`/heroesImg/${hero.id}.png`}
                          alt={hero.englishName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-300 text-center">
                        {language === 'eng' ? <div>{hero.englishName}</div> : <div>{hero.chineseName}</div>}
                        <div className="text-green-400">
                          {language === 'eng' ? `With ${sources.join(', ')}` : `和${sources.join(', ')}配合`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-gray-400">
            Select heroes to see recommendations
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBanPickPanel;