import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shell } from '@/components/Layout'
import { preferredLang } from '@/lib/lang'
import Home from './Home'

/**
 * "/": sends visitors to their language (saved choice, then browser language, then Arabic).
 * The prerendered HTML is the Arabic home page, so crawlers and no-JS visitors still get content.
 */
export default function RootRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate(`/${preferredLang()}/`, { replace: true })
  }, [navigate])
  return <Shell lang="ar" content={<Home />} />
}
