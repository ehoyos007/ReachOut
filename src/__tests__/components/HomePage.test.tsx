import { render, screen, waitFor } from '@testing-library/react';
import Home from '@/app/page';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock next/navigation for App Router components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the Supabase client with proper async behavior
const mockFrom = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ count: 5, data: [], error: null }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
        count: 10,
        data: [],
        error: null,
      }),
    }),
  },
  isSupabaseConfigured: () => true,
}));

describe('Dashboard Page', () => {
  beforeEach(async () => {
    render(<Home />);
    // Wait for the loading state to finish
    await waitFor(() => {
      expect(screen.queryByText('Dashboard')).toBeInTheDocument();
    });
  });

  describe('Page Header', () => {
    it('should display the dashboard title', async () => {
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });

    it('should display the welcome message', async () => {
      await waitFor(() => {
        expect(
          screen.getByText(/Welcome back!/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Stats Cards', () => {
    it('should display Total Contacts stat card', async () => {
      await waitFor(() => {
        expect(screen.getByText('Total Contacts')).toBeInTheDocument();
      });
    });

    it('should display Active Workflows stat card', async () => {
      await waitFor(() => {
        expect(screen.getByText('Active Workflows')).toBeInTheDocument();
      });
    });

    it('should display Messages Sent stat card', async () => {
      await waitFor(() => {
        expect(screen.getByText('Messages Sent')).toBeInTheDocument();
      });
    });

    it('should display Response Rate stat card', async () => {
      await waitFor(() => {
        expect(screen.getByText('Response Rate')).toBeInTheDocument();
      });
    });
  });

  describe('Recent Activity Section', () => {
    it('should display Recent Activity card title', async () => {
      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });

    it('should display activity description', async () => {
      await waitFor(() => {
        expect(
          screen.getByText('Latest messages across all contacts')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions Section', () => {
    it('should display Quick Actions card title', async () => {
      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });
    });

    it('should display quick action buttons', async () => {
      await waitFor(() => {
        expect(screen.getByText('Create New Workflow')).toBeInTheDocument();
        expect(screen.getByText('Import Contacts')).toBeInTheDocument();
        expect(screen.getByText('Manage Templates')).toBeInTheDocument();
      });
    });

    it('should have correct navigation links', async () => {
      await waitFor(() => {
        const links = screen.getAllByRole('link');

        const workflowsNewLink = links.find(
          (link) => link.getAttribute('href') === '/workflows/new'
        );
        const importLink = links.find(
          (link) => link.getAttribute('href') === '/contacts/import'
        );
        const templatesLink = links.find(
          (link) => link.getAttribute('href') === '/templates'
        );

        expect(workflowsNewLink).toBeTruthy();
        expect(importLink).toBeTruthy();
        expect(templatesLink).toBeTruthy();
      });
    });

    it('should display navigation shortcuts', async () => {
      await waitFor(() => {
        expect(screen.getByText('Navigate to')).toBeInTheDocument();
        expect(screen.getByText('Workflows')).toBeInTheDocument();
        expect(screen.getByText('Contacts')).toBeInTheDocument();
        expect(screen.getByText('Templates')).toBeInTheDocument();
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });
  });
});
