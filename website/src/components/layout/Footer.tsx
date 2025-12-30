import { Link } from 'react-router-dom';
import { Github, Twitter, Heart } from 'lucide-react';

const footerLinks = {
  product: [
    { name: 'Getting Started', href: '/docs' },
    { name: 'CLI Reference', href: '/cli' },
    { name: 'API Reference', href: '/api' },
    { name: 'Examples', href: '/examples' },
  ],
  resources: [
    { name: 'Fix Suggestions', href: '/fixes' },
    { name: 'GitHub', href: 'https://github.com/nicholasoxford/react-check', external: true },
    { name: 'npm', href: 'https://www.npmjs.com/package/@oxog/react-check', external: true },
    { name: 'Changelog', href: 'https://github.com/nicholasoxford/react-check/releases', external: true },
  ],
  community: [
    { name: 'GitHub Discussions', href: 'https://github.com/nicholasoxford/react-check/discussions', external: true },
    { name: 'Issues', href: 'https://github.com/nicholasoxford/react-check/issues', external: true },
    { name: 'Contributing', href: 'https://github.com/nicholasoxford/react-check/blob/main/CONTRIBUTING.md', external: true },
  ],
};

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <span className="text-primary text-xl font-bold">&lt;</span>
              <span className="text-lg font-bold text-foreground">ReactCheck</span>
              <span className="text-primary text-xl font-bold">/&gt;</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Scan, diagnose, and fix React performance issues with actionable suggestions.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/nicholasoxford/react-check"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/nicholasoxford"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Community</h3>
            <ul className="space-y-3">
              {footerLinks.community.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ReactCheck. MIT License.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-critical" /> by{' '}
            <a
              href="https://github.com/ersinkoc"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              ersinkoc
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
