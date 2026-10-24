import { Link } from 'react-router-dom'
import { Meta } from '@/components/Meta'
import { href, useLang, useT } from '@/lib/lang'

export default function NotFound() {
  const lang = useLang()
  const t = useT()
  return (
    <div className="container-x py-24 text-center">
      <Meta title={`${t.notFound.title} | ITCITADEL`} />
      <p className="latin text-7xl font-extrabold text-faint">404</p>
      <h1 className="mt-4 text-3xl font-bold">{t.notFound.title}</h1>
      <Link to={href(lang)} className="btn-light mt-8">
        {t.notFound.back}
      </Link>
    </div>
  )
}
