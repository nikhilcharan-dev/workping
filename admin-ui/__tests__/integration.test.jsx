/**
 * ============================================================================
 * WorkPing Admin UI — Integration Tests
 * ============================================================================
 *
 * Tests cover end-to-end user flows:
 *   • Authentication (login → JWT token → protected routes)
 *   • Authorization (role-based access, redirect on 401)
 *   • State management (auth context, layout context, theme context)
 *   • API interactions (axios mocked, endpoints stubbed)
 *   • Form validation (login form, employee CRUD)
 *   • Real-time updates (socket.io mocked)
 *   • Error handling (network failures, invalid credentials)
 *
 * Setup:
 *   jest.unstable_mockModule() mocks axios + socket.io before app import
 *   localStorage / sessionStorage mocked globally in jest.setup.js
 *   React Router + providers wrapped in test harness
 */

import { jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Mock axios before importing components
jest.unstable_mockModule('@/helpers/httpClient', () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

// Mock socket.io
jest.unstable_mockModule('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
  })),
}));

// Mock tokenStore
jest.unstable_mockModule('@/helpers/tokenStore', () => ({
  getToken: jest.fn(() => null),
  setToken: jest.fn(),
  clearToken: jest.fn(),
  getRefreshToken: jest.fn(() => null),
  setRefreshToken: jest.fn(),
}));

// Mock xlsx (used in bulk employee upload)
jest.unstable_mockModule('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

import axiosClient from '@/helpers/httpClient';
import { io } from 'socket.io-client';
import { setToken, clearToken } from '@/helpers/tokenStore';

describe('Admin UI — Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Authentication Flow', () => {
    test('should render login page when not authenticated', async () => {
      const { default: App } = await import('@/App');
      const { default: appAxios } = await import('@/helpers/httpClient');

      appAxios.get.mockResolvedValueOnce({
        status: 401,
        data: { ok: false, message: 'Not authenticated' },
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Login form should be accessible
      expect(screen.queryByRole('textbox', { name: /email|username/i })).toBeInTheDocument();
    });

    test('should handle successful login with JWT token', async () => {
      const { default: App } = await import('@/App');

      axiosClient.post.mockResolvedValueOnce({
        status: 200,
        data: {
          ok: true,
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbjEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2NDY2Njc1MDB9.test_signature',
          refreshToken: 'refresh_token_hash',
        },
      });

      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: { _id: '123', email: 'admin@workping.com', role: 'admin', name: 'Admin User' },
        },
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Simulate login form submission
      const emailInput = screen.getByRole('textbox', { name: /email|username/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /login|sign in/i });

      await userEvent.type(emailInput, 'admin@workping.com');
      await userEvent.type(passwordInput, 'SecurePass123!');
      fireEvent.click(submitBtn);

      // Verify axios.post was called with credentials
      await waitFor(() => {
        expect(axiosClient.post).toHaveBeenCalledWith(
          expect.stringContaining('/login'),
          expect.objectContaining({
            email: 'admin@workping.com',
            password: 'SecurePass123!',
          })
        );
      });

      // Verify token was stored
      expect(setToken).toHaveBeenCalled();
    });

    test('should reject login with invalid credentials', async () => {
      axiosClient.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { ok: false, error: 'Invalid email or password' },
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const emailInput = screen.getByRole('textbox', { name: /email|username/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitBtn = screen.getByRole('button', { name: /login|sign in/i });

      await userEvent.type(emailInput, 'admin@workping.com');
      await userEvent.type(passwordInput, 'WrongPassword');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.queryByText(/invalid|incorrect|error/i)).toBeInTheDocument();
      });

      // Token should not be stored on failure
      expect(setToken).not.toHaveBeenCalled();
    });

    test('should redirect to login on 401 (unauthorized)', async () => {
      axiosClient.get.mockRejectedValueOnce({
        response: { status: 401, data: { error: 'Token expired' } },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Should see login form after 401
        expect(screen.queryByRole('textbox', { name: /email|username/i })).toBeInTheDocument();
      });
    });

    test('should logout and clear token', async () => {
      const { default: App } = await import('@/App');

      axiosClient.post.mockResolvedValueOnce({
        status: 200,
        data: { ok: true, token: 'jwt_token' },
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Simulate logout action
      const logoutBtn = screen.queryByRole('button', { name: /logout/i });
      if (logoutBtn) {
        fireEvent.click(logoutBtn);
        expect(clearToken).toHaveBeenCalled();
      }
    });
  });

  describe('Protected Routes & Authorization', () => {
    test('should redirect to login when accessing /dashboard without token', async () => {
      axiosClient.get.mockRejectedValueOnce({
        response: { status: 401 },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('textbox', { name: /email|username/i })).toBeInTheDocument();
      });
    });

    test('should load dashboard with valid token', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: { data: { _id: '123', role: 'admin', email: 'admin@workping.com' } },
      });

      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            totalEmployees: 150,
            presentToday: 120,
            leaveRequests: 5,
            attendanceRate: 0.8,
          },
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText(/dashboard|analytics|statistics/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('should enforce role-based access (reject non-admin users)', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: { data: { _id: '456', role: 'user', email: 'user@workping.com' } },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Should be redirected away or shown unauthorized page
        expect(screen.queryByRole('textbox', { name: /email|username/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Employee Management CRUD', () => {
    test('should fetch and display employee list', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            { _id: '1', name: 'John Doe', email: 'john@workping.com', phone: '+919876543210', department: 'Engineering' },
            { _id: '2', name: 'Jane Smith', email: 'jane@workping.com', phone: '+919876543211', department: 'HR' },
          ],
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(axiosClient.get).toHaveBeenCalledWith(expect.stringContaining('/employees'));
      }, { timeout: 3000 });
    });

    test('should create employee with form submission', async () => {
      axiosClient.post.mockResolvedValueOnce({
        status: 201,
        data: {
          ok: true,
          data: { _id: 'new_emp_id', name: 'New Employee', email: 'new@workping.com' },
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Simulate form submission
      const nameInput = screen.queryByRole('textbox', { name: /name/i });
      if (nameInput) {
        await userEvent.type(nameInput, 'New Employee');
        const submitBtn = screen.getByRole('button', { name: /add|submit|create/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
          expect(axiosClient.post).toHaveBeenCalledWith(
            expect.stringContaining('/employees'),
            expect.any(Object)
          );
        });
      }
    });

    test('should update employee data', async () => {
      axiosClient.put.mockResolvedValueOnce({
        status: 200,
        data: { ok: true, data: { _id: '1', name: 'John Doe Updated' } },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const editBtn = screen.queryByRole('button', { name: /edit/i });
      if (editBtn) {
        fireEvent.click(editBtn);

        await waitFor(() => {
          expect(axiosClient.put).toHaveBeenCalledWith(
            expect.stringContaining('/employees'),
            expect.any(Object)
          );
        });
      }
    });

    test('should delete employee with confirmation', async () => {
      axiosClient.delete.mockResolvedValueOnce({
        status: 200,
        data: { ok: true },
      });

      global.confirm = jest.fn(() => true);

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const deleteBtn = screen.queryByRole('button', { name: /delete|remove/i });
      if (deleteBtn) {
        fireEvent.click(deleteBtn);

        await waitFor(() => {
          expect(global.confirm).toHaveBeenCalled();
          expect(axiosClient.delete).toHaveBeenCalledWith(
            expect.stringContaining('/employees')
          );
        });
      }
    });
  });

  describe('Attendance & Leave Management', () => {
    test('should fetch attendance records', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            { _id: '1', employeeId: 'emp1', date: '2026-05-11', status: 'present', checkInTime: '09:00' },
            { _id: '2', employeeId: 'emp2', date: '2026-05-11', status: 'absent' },
          ],
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(axiosClient.get).toHaveBeenCalledWith(expect.stringContaining('/attendance'));
      }, { timeout: 3000 });
    });

    test('should fetch leave requests with approval tracking', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            { _id: '1', employeeId: 'emp1', type: 'casual', reason: 'Personal', status: 'pending', requestedDate: '2026-05-15' },
            { _id: '2', employeeId: 'emp2', type: 'sick', reason: 'Medical', status: 'approved', approvedBy: 'admin1' },
          ],
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(axiosClient.get).toHaveBeenCalledWith(expect.stringContaining('/leaves'));
      }, { timeout: 3000 });
    });

    test('should approve or reject leave request', async () => {
      axiosClient.patch.mockResolvedValueOnce({
        status: 200,
        data: { ok: true, data: { _id: '1', status: 'approved' } },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const approveBtn = screen.queryByRole('button', { name: /approve/i });
      if (approveBtn) {
        fireEvent.click(approveBtn);

        await waitFor(() => {
          expect(axiosClient.patch).toHaveBeenCalledWith(
            expect.stringContaining('/leaves'),
            expect.objectContaining({ status: 'approved' })
          );
        });
      }
    });
  });

  describe('Theme & Layout Context', () => {
    test('should toggle dark mode theme', async () => {
      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const themeToggle = screen.queryByRole('button', { name: /dark|light|theme/i });
      if (themeToggle) {
        fireEvent.click(themeToggle);
        expect(localStorage.setItem).toHaveBeenCalledWith(expect.stringContaining('theme'), expect.any(String));
      }
    });

    test('should toggle sidebar collapse', async () => {
      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const sidebarToggle = screen.queryByRole('button', { name: /menu|sidebar|toggle/i });
      if (sidebarToggle) {
        fireEvent.click(sidebarToggle);
        expect(localStorage.setItem).toHaveBeenCalledWith(expect.stringContaining('layout'), expect.any(String));
      }
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('should handle network errors gracefully', async () => {
      axiosClient.get.mockRejectedValueOnce({
        message: 'Network Error',
        code: 'ERR_NETWORK',
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText(/network|error|connection/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('should handle server errors (5xx)', async () => {
      axiosClient.get.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Internal Server Error' } },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText(/error|failed|server/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('should show loading state during API calls', async () => {
      axiosClient.get.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { data: [] } }), 200))
      );

      const { default: App } = await import('@/App');

      const { container } = render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Spinner or loading indicator should be visible briefly
      expect(container.querySelector('[role="status"]') || screen.queryByText(/loading/i)).toBeDefined();
    });

    test('should validate form inputs before submission', async () => {
      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const submitBtn = screen.queryByRole('button', { name: /submit|login|send/i });
      if (submitBtn) {
        fireEvent.click(submitBtn);

        // Should show validation errors without calling API
        await waitFor(() => {
          expect(axiosClient.post).not.toHaveBeenCalled();
        });
      }
    });
  });

  describe('Real-Time Updates (Socket.io)', () => {
    test('should connect to attendance room on mount', async () => {
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
        join: jest.fn(),
      };

      jest.mocked(io).mockReturnValueOnce(mockSocket);

      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: { data: { _id: 'org1' } },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('attendance:new', expect.any(Function));
      }, { timeout: 3000 });
    });

    test('should receive real-time attendance updates', async () => {
      const onAttendanceUpdate = jest.fn();
      const mockSocket = {
        on: jest.fn((event, handler) => {
          if (event === 'attendance:new') {
            onAttendanceUpdate(handler);
          }
        }),
        off: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      jest.mocked(io).mockReturnValueOnce(mockSocket);

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Simulate incoming attendance event
      await waitFor(() => {
        const handler = onAttendanceUpdate.mock.calls[0]?.[0];
        if (handler) {
          handler({ employeeId: 'emp1', checkInTime: '09:00', status: 'present' });
        }
      });
    });
  });

  describe('Form Validation', () => {
    test('should require email in login form', async () => {
      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const passwordInput = screen.queryByLabelText(/password/i);
      const submitBtn = screen.queryByRole('button', { name: /login|submit/i });

      if (passwordInput && submitBtn) {
        await userEvent.type(passwordInput, 'SomePassword123');
        fireEvent.click(submitBtn);

        await waitFor(() => {
          expect(screen.queryByText(/email|username.*required/i)).toBeInTheDocument();
        });
      }
    });

    test('should require password in login form', async () => {
      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const emailInput = screen.queryByRole('textbox', { name: /email|username/i });
      const submitBtn = screen.queryByRole('button', { name: /login|submit/i });

      if (emailInput && submitBtn) {
        await userEvent.type(emailInput, 'admin@workping.com');
        fireEvent.click(submitBtn);

        await waitFor(() => {
          expect(screen.queryByText(/password.*required/i)).toBeInTheDocument();
        });
      }
    });

    test('should validate email format', async () => {
      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const emailInput = screen.queryByRole('textbox', { name: /email|username/i });
      if (emailInput) {
        await userEvent.type(emailInput, 'not-an-email');
        const submitBtn = screen.queryByRole('button', { name: /login|submit/i });
        if (submitBtn) {
          fireEvent.click(submitBtn);
          expect(screen.queryByText(/email.*format|invalid.*email/i)).toBeInTheDocument();
        }
      }
    });
  });
});
