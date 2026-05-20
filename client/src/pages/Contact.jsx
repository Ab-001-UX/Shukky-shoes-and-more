import { MapPin, Phone, Clock, Facebook, AtSign, MessageCircle } from 'lucide-react'
import styles from './Contact.module.css'

export default function Contact() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Store Information</h1>
      <p className={styles.subtitle}>Visit us in-store or reach out!</p>

      <div className={styles.card}>
        <div className={styles.item}>
          <div className={styles.iconWrapper}>
            <MapPin size={24} />
          </div>
          <div className={styles.content}>
            <h3>Our Location</h3>
            <p>34 Gbajumo Street, Shop A42<br />Balogun, Lagos Island</p>
            <a
              href="https://maps.google.com/?q=34+Gbajumo+Street+Balogun+Lagos+Island"
              target="_blank"
              rel="noreferrer"
              className={styles.link}
            >
              Get Directions
            </a>
          </div>
        </div>

        <div className={styles.item}>
          <div className={styles.iconWrapper}>
            <Phone size={24} />
          </div>
          <div className={styles.content}>
            <h3>Phone Number</h3>
            <p>+234 8023708463</p>
            <div className={styles.links}>
              <a href="tel:+2348023708463" className={styles.link}>Call Us</a>
            </div>
          </div>
        </div>

        <div className={styles.item}>
          <div className={styles.iconWrapper} style={{ color: '#25D366' }}>
            <MessageCircle size={24} />
          </div>
          <div className={styles.content}>
            <h3>WhatsApp</h3>
            <p>+234 8023708463</p>
            <a 
              href="https://wa.me/2348023708463" 
              target="_blank" 
              rel="noreferrer" 
              className={styles.link}
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>

        <div className={styles.item}>
          <div className={styles.iconWrapper}>
            <Facebook size={24} />
          </div>
          <div className={styles.content}>
            <h3>Facebook</h3>
            <p>Shukura Arinola Salau Abimbola</p>
          </div>
        </div>

        <div className={styles.item}>
          <div className={styles.iconWrapper}>
            <AtSign size={24} />
          </div>
          <div className={styles.content}>
            <h3>TikTok</h3>
            <p>@shukkyshoes</p>
          </div>
        </div>

        <div className={styles.item}>
          <div className={styles.iconWrapper}>
            <Clock size={24} />
          </div>
          <div className={styles.content}>
            <h3>Opening Hours</h3>
            <p>Monday - Saturday: 8:00 AM - 9:00 PM</p>
            <p>Sunday: Closed</p>
          </div>
        </div>
      </div>
    </div>
  )
}
