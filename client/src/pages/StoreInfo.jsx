import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Phone, Facebook, AtSign, Clock, Truck, RefreshCw, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePolicies } from '../hooks/usePolicies'
import styles from './StoreInfo.module.css'

export default function StoreInfo() {
  const { policies, isLoading } = usePolicies()

  const [openSections, setOpenSections] = useState({
    delivery: false,
    returns: false,
    security: false,
  })

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setOpenSections({
        delivery: true,
        returns: true,
        security: true,
      })
    }
  }, [])

  const toggleSection = (section) => {
    if (window.innerWidth < 768) {
      setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
    }
  }

  const fallbacks = {
    DELIVERY: "Items must move immediately. No stockpiling allowed.\nDelivery fees depend on location and will be calculated at checkout or communicated via WhatsApp.",
    RETURNS: "No returns or complaints after 48 hours of purchase.\nNo replacement or refund for items returned with damage.",
    GENERAL: "Store is open Mon - Sat: 8:00 AM - 9:00 PM.\nAll sales are final after the 48-hour window.",
  }

  const getPolicy = (type) => policies.find(p => p.type === type)?.content || fallbacks[type] || ''

  const renderPolicyContent = (type) => {
    const content = getPolicy(type)
    const lines = content.split('\n')
    // Skip the first line if it's just the title (contains "policy", "terms", or "security")
    const lowerFirst = lines[0] && lines[0].toLowerCase()
    const isTitle = lowerFirst && (lowerFirst.includes('policy') || lowerFirst.includes('terms') || lowerFirst.includes('security'))
    const filteredLines = isTitle ? lines.slice(1) : lines
    
    return filteredLines.map((line, i) => (
      <div key={i} className={styles.line}>{renderLine(line)}</div>
    ))
  }

  // Simple parser to handle **bold** text
  const renderLine = (line) => {
    if (!line) return <br />
    
    const parts = line.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>
      }
      return part.startsWith('- ') ? <span key={i} style={{ paddingLeft: '1rem', display: 'block' }}>{part.substring(2)}</span> : part
    })
  }

  if (isLoading) {
    return (
      <div className={styles.stateWrapper}>
        <div className={styles.spinner}></div>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      <Link to="/" className={styles.backLink}>
        <ArrowLeft size={20} /> Back to Home
      </Link>

      <h1 className={styles.title}>Contact & Policies</h1>

      <div className={styles.sections}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <MapPin className={styles.icon} />
            <h2>Visit or Call Us</h2>
          </div>
          <div className={styles.contactGrid}>
            <div className={styles.contactItem}>
              <strong>Location:</strong>
              <p>34 Gbajumo Street, Shop A42, Balogun, Lagos Island</p>
            </div>
            <div className={styles.contactItem}>
              <strong>Phone:</strong>
              <p>+234 8023708463</p>
            </div>
            <div className={styles.contactItem}>
              <strong>Socials:</strong>
              <p>WhatsApp: +234 8023708463</p>
              <p>Facebook: Shukura Arinola Salau Abimbola</p>
              <p>TikTok: @shukkyshoes</p>
            </div>
            <div className={styles.contactItem}>
              <strong>Hours:</strong>
              <p>Mon - Sat: 8:00 AM - 9:00 PM</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader} onClick={() => toggleSection('delivery')} style={{ cursor: 'pointer' }}>
            <Truck className={styles.icon} />
            <h2>Delivery Policy</h2>
            {openSections.delivery ? <ChevronUp size={20} className={styles.chevron} /> : <ChevronDown size={20} className={styles.chevron} />}
          </div>
          {openSections.delivery && (
            <div className={styles.content}>
              <div className={styles.markdown}>
                {renderPolicyContent('DELIVERY')}
              </div>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader} onClick={() => toggleSection('returns')} style={{ cursor: 'pointer' }}>
            <RefreshCw className={styles.icon} />
            <h2>Return & Exchange Policy</h2>
            {openSections.returns ? <ChevronUp size={20} className={styles.chevron} /> : <ChevronDown size={20} className={styles.chevron} />}
          </div>
          {openSections.returns && (
            <div className={styles.content}>
               <div className={styles.markdown}>
                {renderPolicyContent('RETURNS')}
              </div>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader} onClick={() => toggleSection('security')} style={{ cursor: 'pointer' }}>
            <ShieldCheck className={styles.icon} />
            <h2>Terms & Security</h2>
            {openSections.security ? <ChevronUp size={20} className={styles.chevron} /> : <ChevronDown size={20} className={styles.chevron} />}
          </div>
          {openSections.security && (
            <div className={styles.content}>
               <div className={styles.markdown}>
                {renderPolicyContent('GENERAL')}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
