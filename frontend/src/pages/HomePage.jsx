import { Link } from 'react-router-dom';
import '../styles/HomePage.css';

export default function HomePage() {
  return (
    <div className="home-main">
      <div className="title">
        <div className='genoflow-logo'></div>
        <h1>GenoFlow</h1>
      </div>

      <div className="entry">
        <Link to="/analysis" className="analysis-entry entry-box">
          <p className="entry-title">DNA Barcode Toolkit</p>
          <div className="card-image"></div>
          <div className="entry-description">
            <ul>
              <li>Run automated analysis pipelines and monitor progress in real time.</li>
              <li>Review results, logs, and status for ongoing or completed runs.</li>
              <li>Export analysis outputs and manage processing jobs from a single interface.</li>
            </ul>
          </div>
        </Link>

        <Link to="/phylotree" className="visualization-entry entry-box">
          <p className="entry-title">Visualization</p>
          <div className="card-image"></div>
          <div className="entry-description">
            <ul>
              <li>Explore interactive phylogenetic trees with node details and export options.</li>
              <li>Visualize haplotype networks alongside geographic maps and linked tables.</li>
              <li>Inspect sequence alignments and interactively filter or export visual data.</li>
            </ul>
          </div>
        </Link>
      </div>

      <section className="connect-us">
        <h2>Contact Us</h2>
        <div className="contact-list">
          <div className="contact-person">
            <p className="person-name">uiskskkekekk</p>
            <a href="mailto:john.doe@example.com">uiskskkekekk@example.com</a>
          </div>
          <div className="contact-person">
            <p className="person-name">uiskskkekekk</p>
            <a href="mailto:jane.smith@example.com">uiskskkekekk@example.com</a>
          </div>
          <div className="contact-person">
            <p className="person-name">uiskskkekekk</p>
            <a href="mailto:alex.johnson@example.com">uiskskkekekk@example.com</a>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>© 2025 GenoFlow. All rights reserved.</p>
      </footer>
    </div>
  );
}