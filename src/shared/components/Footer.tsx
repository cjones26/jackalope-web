const Footer = () => {
  return (
    <footer className="border-t border-border px-6 py-4 mt-auto">
      <div className="mx-auto flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
        <div className="mb-2 sm:mb-0">
          © {new Date().getFullYear()} Valence Software. All rights reserved.
        </div>
        <div className="flex space-x-6">
          <a
            href="mailto:contact@valencesoftware.com"
            className="hover:text-foreground transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
