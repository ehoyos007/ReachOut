import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('Home Page', () => {
  beforeEach(() => {
    render(<Home />);
  });

  describe('Header', () => {
    it('should display the app name', () => {
      expect(screen.getByText('ReachOut')).toBeInTheDocument();
    });

    it('should have navigation links', () => {
      const navLinks = screen.getAllByRole('link');
      const workflowLinks = navLinks.filter((link) =>
        link.getAttribute('href') === '/workflows'
      );
      const contactLinks = navLinks.filter((link) =>
        link.getAttribute('href') === '/contacts'
      );

      expect(workflowLinks.length).toBeGreaterThan(0);
      expect(contactLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Hero Section', () => {
    it('should display the main heading', () => {
      expect(
        screen.getByText('Automated Outreach Made Simple')
      ).toBeInTheDocument();
    });

    it('should display the description', () => {
      expect(
        screen.getByText(/Build and run automated SMS and email outreach campaigns/i)
      ).toBeInTheDocument();
    });
  });

  describe('Feature Cards', () => {
    it('should display Workflows feature', () => {
      // Multiple elements have "Workflows" text (nav + card heading)
      expect(screen.getAllByText('Workflows').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/Create visual automation sequences/i)
      ).toBeInTheDocument();
    });

    it('should display Contacts feature', () => {
      // Multiple elements have "Contacts" text (nav + card heading)
      expect(screen.getAllByText('Contacts').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/Manage your contacts and organize them/i)
      ).toBeInTheDocument();
    });

    it('should display Templates feature', () => {
      // Multiple elements have "Templates" text (nav + card heading)
      expect(screen.getAllByText('Templates').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/Create reusable SMS and email message templates/i)
      ).toBeInTheDocument();
    });

    it('should display Settings feature', () => {
      // Multiple elements have "Settings" text (nav + card heading)
      expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/Configure Twilio, SendGrid, and other integrations/i)
      ).toBeInTheDocument();
    });

    it('should have clickable links for Workflows and Contacts', () => {
      const links = screen.getAllByRole('link');
      const workflowsLink = links.find(
        (link) => link.getAttribute('href') === '/workflows'
      );
      const contactsLink = links.find(
        (link) => link.getAttribute('href') === '/contacts'
      );

      expect(workflowsLink).toBeInTheDocument();
      expect(contactsLink).toBeInTheDocument();
    });

    it('should have clickable links for Templates', () => {
      const links = screen.getAllByRole('link');
      const templatesLink = links.find(
        (link) => link.getAttribute('href') === '/templates'
      );

      expect(templatesLink).toBeInTheDocument();
    });

    it('should have clickable links for Settings', () => {
      const links = screen.getAllByRole('link');
      const settingsLink = links.find(
        (link) => link.getAttribute('href') === '/settings'
      );

      expect(settingsLink).toBeInTheDocument();
    });
  });
});
