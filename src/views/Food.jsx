import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Card from '../components/Card.jsx';
import useScrollLock from '../lib/useScrollLock.js';

const SEARCH_LIMIT = 8;

function progressClass(consumed, target) {
  if (!target || !consumed) return 'progressNeutral';
  if (consumed <= target) return 'progressGood';
  return 'progressBad';
}

function foodAmountLabel(entry) {
  if (!entry.amount) return entry.unit || 'serving';
  return `${entry.amount}${entry.unit === 'g' ? 'g' : ` ${entry.unit || 'serving'}`}`;
}

function calorieTone(consumed, target) {
  if (!target) return 'Set your profile to unlock a target.';
  if (!consumed) return 'Start with the easiest thing to log.';
  if (consumed <= target) return 'You are inside today\'s target.';
  return 'You are over target. Keep logging honestly and use the next meal to steady the day.';
}

async function searchFoods(query, signal) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const response = await fetch(`/api/food-search?q=${encodeURIComponent(trimmed)}`, { signal });
    if (!response.ok) throw new Error('Food search failed.');
    const data = await response.json();
    return Array.isArray(data.items) ? data.items.slice(0, SEARCH_LIMIT) : [];
  } catch (error) {
    if (signal?.aborted) throw error;
    return searchOpenFoodFactsDirect(trimmed, signal);
  }
}

async function searchOpenFoodFactsDirect(query, signal) {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '8');
  url.searchParams.set('fields', 'code,product_name,brands,nutriments');

  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Food search failed.');
  const data = await response.json();
  return (Array.isArray(data.products) ? data.products : [])
    .map((product) => {
      const caloriesPer100g = Math.round(Number(product?.nutriments?.['energy-kcal_100g']));
      const name = String(product?.product_name || '').trim();
      if (!name || !Number.isFinite(caloriesPer100g) || caloriesPer100g <= 0) return null;
      return {
        id: String(product.code || `${name}-${caloriesPer100g}`).slice(0, 80),
        name: name.slice(0, 80),
        brand: String(product.brands || '').split(',')[0].trim().slice(0, 40),
        caloriesPer100g: Math.min(caloriesPer100g, 1200),
      };
    })
    .filter(Boolean)
    .slice(0, SEARCH_LIMIT);
}

export default function Food({ state, dailyLog, onSaveFoodEntry, onDeleteFoodEntry }) {
  const targetCalories = Number(state.settings.calorieTarget || state.healthPlan.calorieTarget || 0);
  const entries = Array.isArray(dailyLog.foodEntries) ? dailyLog.foodEntries : [];
  const consumed = entries.reduce((total, entry) => total + (Number.parseInt(entry.calories, 10) || 0), 0);
  const remaining = targetCalories ? targetCalories - consumed : null;
  const progress = targetCalories ? Math.min(100, Math.round((consumed / targetCalories) * 100)) : 0;
  const onMedication = state.onboardingProfile.usesWeightLossMedication && state.onboardingProfile.medicationName !== 'none';
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchClosing, setSearchClosing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [portionGrams, setPortionGrams] = useState('100');
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualError, setManualError] = useState('');
  const [toast, setToast] = useState('');
  const abortRef = useRef(null);
  const closeTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const resultMap = useMemo(() => new Map(results.map((item) => [item.id, item])), [results]);

  useEffect(() => () => {
    abortRef.current?.abort();
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(toastTimerRef.current);
  }, []);

  useScrollLock(searchOpen);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') requestCloseSearch();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  async function handleSearch(event) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchStatus('Type a food name first.');
      setResults([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6500);
    abortRef.current = controller;
    setSearching(true);
    setSearchStatus('');

    try {
      const items = await searchFoods(trimmed, controller.signal);
      setResults(items);
      setSearchStatus(items.length ? '' : 'No useful matches. Quick add still works.');
    } catch {
      setResults([]);
      setSearchStatus('Search timed out. Quick add still works.');
    } finally {
      window.clearTimeout(timeout);
      setSearching(false);
    }
  }

  function clearSearch() {
    abortRef.current?.abort();
    setQuery('');
    setResults([]);
    setSearchStatus('');
    setSearching(false);
    setSelectedId(null);
    setPortionGrams('100');
  }

  function openSearch() {
    setSearchOpen(true);
    setSearchClosing(false);
  }

  function requestCloseSearch() {
    if (searchClosing) return;
    abortRef.current?.abort();
    setSearchClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      clearSearch();
      setSearchOpen(false);
      setSearchClosing(false);
    }, 240);
  }

  function showToast(message) {
    window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 1800);
  }

  function closeSearchNow() {
    clearSearch();
    setSearchOpen(false);
    setSearchClosing(false);
  }

  function handleResultTap(id) {
    if (selectedId === id) {
      setSelectedId(null);
    } else {
      setSelectedId(id);
      setPortionGrams('100');
    }
  }

  function confirmAdd(item) {
    const grams = Math.max(1, Math.min(2000, Number(portionGrams) || 100));
    const calories = Math.round((grams / 100) * item.caloriesPer100g);
    onSaveFoodEntry({
      name: item.name,
      calories,
      amount: grams,
      unit: 'g',
      source: 'openfoodfacts',
    });
    closeSearchNow();
    showToast(`${item.name} added`);
  }

  function addManualEntry(event) {
    event.preventDefault();
    const calories = Number.parseInt(manualCalories, 10);
    if (!manualName.trim()) {
      setManualError('Add a food name.');
      return;
    }
    if (!Number.isFinite(calories) || calories <= 0 || calories > 10000) {
      setManualError('Use calories between 1 and 10000.');
      return;
    }
    onSaveFoodEntry({
      name: manualName,
      calories,
      amount: 1,
      unit: 'serving',
      source: 'manual',
    });
    setManualName('');
    setManualCalories('');
    setManualError('');
    showToast('Calories added');
  }

  return (
    <>
    <div className="staggerStack">
      <Card className={`heroCard calorieHero ${progressClass(consumed, targetCalories)}`}>
        <div className="calorieHeroTop">
          <div>
            <div className="label">Calories today</div>
            <div className="big">{remaining === null ? '-' : Math.max(0, remaining)}</div>
            <p className="note">{remaining !== null && remaining < 0 ? `${Math.abs(remaining)} kcal over` : 'kcal left'}</p>
          </div>
          <div className="calorieRing" style={{ '--calorie-progress': `${progress}%` }}>
            <span>{progress}%</span>
          </div>
        </div>
        <div className="calorieBudgetLine">
          <span><b>{consumed}</b> logged</span>
          <span><b>{targetCalories || '-'}</b> target</span>
        </div>
        <div className="track calorieTrack" aria-hidden="true"><span className="fill" style={{ width: `${progress}%` }} /></div>
        <p className="note strong">{calorieTone(consumed, targetCalories)}</p>
      </Card>

      {onMedication ? (
        <div className="calorieNudge" role="note">
          Smaller meals spread across the day may sit better while you are on medication.
        </div>
      ) : null}

      <Card>
        <div className="cardTitleRow compactTitleRow">
          <div>
            <div className="label">Quick add</div>
            <p className="note tightNote">Best for meals you already know.</p>
          </div>
          <button className="clearSetupButton searchLaunchButton" type="button" onClick={openSearch}>Search</button>
        </div>
        <form className="manualFoodForm calorieQuickAdd" onSubmit={addManualEntry}>
          <label>
            Food
            <input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="e.g. lunch" />
          </label>
          <label>
            Calories <span className="unitSuffix">kcal</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="10000"
              value={manualCalories}
              onChange={(event) => {
                setManualError('');
                setManualCalories(event.target.value);
              }}
              placeholder="520"
            />
          </label>
          <button className="main" type="submit">Add calories</button>
        </form>
        {manualError ? <p className="note warn">{manualError}</p> : null}
      </Card>

      <Card>
        <div className="cardTitleRow compactTitleRow">
          <div className="label">Today&apos;s diary</div>
          <span className="statusPill">{entries.length} items</span>
        </div>
        {entries.length ? (
          <div className="history foodLog">
            {entries.map((entry) => (
              <div className="historyRow tall foodLogRow" key={entry.id}>
                <span className="foodLogName"><b>{entry.name}</b> {foodAmountLabel(entry)}</span>
                <span className="foodLogCalories">{entry.calories} kcal</span>
                <button type="button" onClick={() => onDeleteFoodEntry(entry.id)}>Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="emptyDiary">
            <b>No food logged yet</b>
            <span>Add a meal, snack, or rough estimate. The useful part is the running total.</span>
          </div>
        )}
      </Card>
      {searchOpen ? createPortal((
        <div className={`foodSearchBackdrop ${searchClosing ? 'closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="food-search-title" onClick={requestCloseSearch}>
          <div className={`foodSearchSheet ${searchClosing ? 'closing' : ''}`} onClick={(event) => event.stopPropagation()}>
            <div className="foodSearchHandle" aria-hidden="true" />
            <div className="foodSearchHeader">
              <div>
                <div className="label">Food search</div>
                <h2 id="food-search-title">Find calories fast</h2>
              </div>
              <button className="searchCloseButton" type="button" onClick={requestCloseSearch} aria-label="Close food search">
                <span aria-hidden="true" />
              </button>
            </div>
            <form className="foodSearchForm modalSearchForm" onSubmit={handleSearch}>
              <label>
                Food name
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    if (!event.target.value) {
                      setResults([]);
                      setSearchStatus('');
                    }
                  }}
                  placeholder="Greek yoghurt, oats, chicken..."
                />
              </label>
              <div className="searchActions">
                <button className="main" type="submit" disabled={searching}>{searching ? 'Searching...' : 'Search'}</button>
                <button className="main secondary" type="button" onClick={clearSearch}>Clear</button>
              </div>
            </form>

            <div className="searchHintRow">
              <span>Free test database</span>
              <span>Tap a result to add 100g</span>
            </div>

            {searching ? (
              <div className="searchSkeleton" aria-label="Searching foods">
                <i /><i /><i />
              </div>
            ) : null}

            {searchStatus ? <p className="note searchStatus">{searchStatus}</p> : null}
            {results.length ? (
              <div className="foodResults modalFoodResults">
                {results.map((item, index) => {
                  const isSelected = selectedId === item.id;
                  const grams = Math.max(1, Math.min(2000, Number(portionGrams) || 100));
                  const previewKcal = isSelected ? Math.round((grams / 100) * item.caloriesPer100g) : null;
                  return (
                    <div key={item.id} className="foodResultGroup" style={{ '--result-index': index }}>
                      <button
                        className={`foodResult${isSelected ? ' selected' : ''}`}
                        type="button"
                        onClick={() => handleResultTap(item.id)}
                        aria-expanded={isSelected}
                      >
                        <div>
                          <b>{item.name}</b>
                          <span>{item.brand || 'Open Food Facts'}</span>
                        </div>
                        <strong>{item.caloriesPer100g}<em>kcal/100g</em></strong>
                      </button>
                      {isSelected ? (
                        <div className="foodPortionPicker">
                          <div className="foodPortionQuick">
                            {[50, 100, 150, 200].map((g) => (
                              <button
                                key={g}
                                type="button"
                                className={`portionChip${portionGrams === String(g) ? ' active' : ''}`}
                                onClick={() => setPortionGrams(String(g))}
                              >
                                {g}g
                              </button>
                            ))}
                          </div>
                          <div className="foodPortionInput">
                            <label>
                              Amount
                              <div className="foodPortionInputRow">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="1"
                                  max="2000"
                                  value={portionGrams}
                                  onChange={(e) => setPortionGrams(e.target.value)}
                                  autoFocus
                                />
                                <span className="portionUnit">g</span>
                                <span className="portionKcal">{previewKcal} kcal</span>
                              </div>
                            </label>
                          </div>
                          <button
                            className="main"
                            type="button"
                            onClick={() => confirmAdd(item)}
                            disabled={!portionGrams || Number(portionGrams) <= 0}
                          >
                            Add to diary
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : !searching ? (
              <div className="searchEmptyState">
                <b>{query ? 'No selected result yet' : 'Search packaged foods'}</b>
                <span>{query ? 'Try a simpler name, or close this and quick add your own estimate.' : 'Use quick add for home-cooked meals, rough estimates, or anything not in the test database.'}</span>
              </div>
            ) : null}
          </div>
        </div>
      ), document.body) : null}
    </div>
    {toast ? createPortal((
        <div className="calorieToast" role="status" aria-live="polite">
          <span>{toast}</span>
        </div>
      ), document.body) : null}
    </>
  );
}
