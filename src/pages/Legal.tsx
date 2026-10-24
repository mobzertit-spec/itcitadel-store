import { Meta } from '@/components/Meta'
import { BUSINESS } from '@/config'
import { PRIVACY, TERMS } from '@/i18n/legal'
import { useLang, useT } from '@/lib/lang'

const ID_LABELS = { rc: 'RC', nif: 'NIF', nis: 'NIS', ai: 'AI' } as const

export default function Legal() {
  const lang = useLang()
  const t = useT()
  const ids = (Object.keys(ID_LABELS) as (keyof typeof ID_LABELS)[]).filter((k) => BUSINESS.legal[k])
  return (
    <div className="container-x max-w-3xl pt-12 sm:pt-14">
      <Meta title={t.meta.legalTitle} description={t.meta.legalDescription} />
      <h1 className="h-section">{t.legal.title}</h1>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">{t.legal.terms}</h2>
        <div className="mt-5 space-y-6">
          {TERMS[lang].map((s) => (
            <div key={s.title}>
              <h3 className="font-bold">{s.title}</h3>
              {s.paragraphs.map((p) => (
                <p key={p} className="mt-1.5 text-muted">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">{t.legal.company}</h2>
        <dl className="card mt-5 grid gap-x-6 gap-y-3 p-6 sm:grid-cols-[auto_1fr]">
          <dt className="font-semibold">ITCITADEL</dt>
          <dd className="text-muted">{BUSINESS.address[lang]}</dd>
          <dt className="font-semibold">{t.office.phone}</dt>
          <dd className="ltr-iso text-muted">{BUSINESS.phones.join(' · ')}</dd>
          <dt className="font-semibold">{t.office.email}</dt>
          <dd className="text-muted">{BUSINESS.email}</dd>
          <dt className="font-semibold">{t.office.hours}</dt>
          <dd className="text-muted">{t.office.hoursValue}</dd>
          {ids.map((k) => (
            <div key={k} className="contents">
              <dt className="font-semibold">{ID_LABELS[k]}</dt>
              <dd className="ltr-iso text-muted">{BUSINESS.legal[k]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">{t.legal.privacy}</h2>
        <div className="mt-5 space-y-3 text-muted">
          {PRIVACY[lang].map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>
    </div>
  )
}
