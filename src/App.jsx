import { useState, useEffect, useMemo } from 'react'
import './App.css'

const API_KEY = '9633e05c68a64127b287bdb17997e20a'
const API_BASE = `https://openapi.gg.go.kr/PlaceThatDoATasteyFoodSt?KEY=${API_KEY}&Type=json`
const INITIAL_COUNT = 12
const LOAD_MORE_COUNT = 12

function normalizeRow(row) {
  return Array.isArray(row) ? row : (row ? [row] : [])
}

async function fetchAllRestaurants() {
  const all = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const url = `${API_BASE}&pIndex=${page}&pSize=100`
    const res = await fetch(url)
    const data = await res.json()

    if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
      throw new Error(data.RESULT.MESSAGE || '데이터를 불러올 수 없습니다.')
    }

    const apiData = data.PlaceThatDoATasteyFoodSt
    if (!apiData || apiData.length < 2) break

    const result = apiData[1]
    const rows = normalizeRow(result.row)
    all.push(...rows)

    const total = apiData[0]?.head?.[0]?.list_total_count ?? 0
    hasMore = all.length < total && rows.length === 100
    page++
  }

  return all
}

function RestaurantCard({ restaurant }) {
  const { RESTRT_NM, REPRSNT_FOOD_NM, TASTFDPLC_TELNO, REFINE_ROADNM_ADDR } = restaurant
  const mapQuery = encodeURIComponent(REFINE_ROADNM_ADDR || RESTRT_NM)

  return (
    <article className="restaurant-card">
      <h3 className="card-name">{RESTRT_NM || '-'}</h3>
      <p className="card-food">{REPRSNT_FOOD_NM || '-'}</p>
      {TASTFDPLC_TELNO && (
        <p className="card-detail">
          <a href={`tel:${TASTFDPLC_TELNO}`}>{TASTFDPLC_TELNO}</a>
        </p>
      )}
      {REFINE_ROADNM_ADDR && (
        <p className="card-detail card-addr">{REFINE_ROADNM_ADDR}</p>
      )}
      <a
        href={`https://map.naver.com/v5/search/${mapQuery}`}
        target="_blank"
        rel="noopener noreferrer"
        className="card-link"
      >
        지도 보기
      </a>
    </article>
  )
}

function App() {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRegion, setSelectedRegion] = useState('전체')
  const [displayCount, setDisplayCount] = useState(INITIAL_COUNT)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchAllRestaurants()
      .then((data) => {
        const sorted = [...data].sort((a, b) => (a.RESTRT_NM || '').localeCompare(b.RESTRT_NM || '', 'ko'))
        setRestaurants(sorted)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const regions = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.SIGUN_NM).filter(Boolean))
    return ['전체', ...[...set].sort((a, b) => a.localeCompare(b, 'ko'))]
  }, [restaurants])

  const filtered = useMemo(() => {
    let list = selectedRegion === '전체'
      ? restaurants
      : restaurants.filter((r) => r.SIGUN_NM === selectedRegion)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (r) =>
          (r.RESTRT_NM || '').toLowerCase().includes(q) ||
          (r.REFINE_ROADNM_ADDR || '').toLowerCase().includes(q) ||
          (r.REFINE_LOTNO_ADDR || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [restaurants, selectedRegion, searchQuery])

  const visible = useMemo(
    () => filtered.slice(0, displayCount),
    [filtered, displayCount]
  )
  const hasMore = displayCount < filtered.length

  const handleRegionChange = (e) => {
    setSelectedRegion(e.target.value)
    setDisplayCount(INITIAL_COUNT)
  }

  const handleSearch = (e) => {
    e?.preventDefault()
    setSearchQuery(searchTerm)
    setDisplayCount(INITIAL_COUNT)
  }

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + LOAD_MORE_COUNT)
  }

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <span className="badge">경기으뜸맛집</span>
          <h1>경기도 맛집 현황</h1>
          <p className="subtitle">지역별로 필터링하여 보세요</p>
        </header>
        <div className="loading">데이터를 불러오는 중…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <header className="header">
          <span className="badge">경기으뜸맛집</span>
          <h1>경기도 맛집 현황</h1>
        </header>
        <div className="error">{error}</div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <span className="badge">경기으뜸맛집</span>
        <h1>경기도 맛집 현황</h1>
        <p className="subtitle">지역별로 필터링하여 보세요</p>

        <div className="filter-wrap">
          <label htmlFor="region">지역 선택</label>
          <select id="region" value={selectedRegion} onChange={handleRegionChange}>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className="filter-count">{filtered.length}곳</span>
        </div>

        <form className="search-wrap" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="식당 이름 또는 주소로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="검색어"
          />
          <button type="submit" className="search-btn">
            검색하기
          </button>
        </form>
        {searchQuery && (
          <p className="search-result-msg">
            &quot;{searchQuery}&quot; 검색 결과 {filtered.length}곳
          </p>
        )}
      </header>

      <main className="main">
        {filtered.length === 0 ? (
          <p className="search-empty">검색 결과가 없습니다.</p>
        ) : (
          <>
            <div className="grid">
              {visible.map((r, i) => (
                <RestaurantCard key={`${r.RESTRT_NM}-${r.REFINE_ROADNM_ADDR}-${i}`} restaurant={r} />
              ))}
            </div>

                {hasMore && (
              <div className="load-more-wrap">
                <button type="button" className="load-more" onClick={handleLoadMore}>
                  더보기
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        ※ 경기으뜸맛집 사업은 2020년 이후 폐지되었으며, 데이터는 2023년 기준입니다.
      </footer>
    </div>
  )
}

export default App
