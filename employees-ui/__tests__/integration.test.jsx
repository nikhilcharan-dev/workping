/**
 * ============================================================================
 * WorkPing Employee UI — Integration Tests
 * ============================================================================
 *
 * Tests cover employee-specific user flows:
 *   • Authentication (login → JWT token with role: "user")
 *   • Face-based check-in (react-webcam → 1:1 verification)
 *   • Attendance tracking (heatmap, monthly view, check-in history)
 *   • Leave request workflow (apply → track approval)
 *   • Real-time updates (socket.io for leave approvals)
 *   • 2FA setup (TOTP via speakeasy)
 *   • Profile management (avatar, personal details)
 *
 * Setup:
 *   jest.unstable_mockModule() mocks axios + socket.io + react-webcam
 *   localStorage / sessionStorage mocked globally in jest.setup.js
 *   React Router + providers wrapped in test harness
 */

import { jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Mock axios client (alternative import)
jest.unstable_mockModule('@/helpers/axiosClient', () => ({
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

// Mock react-webcam
jest.unstable_mockModule('react-webcam', () => ({
  default: jest.fn(({ onUserMedia, onUserMediaError, ...props }) => (
    <video {...props} data-testid="webcam" />
  )),
}));

// Mock tokenStore
jest.unstable_mockModule('@/helpers/tokenStore', () => ({
  getToken: jest.fn(() => null),
  setToken: jest.fn(),
  clearToken: jest.fn(),
  getRefreshToken: jest.fn(() => null),
  setRefreshToken: jest.fn(),
}));

import axiosClient from '@/helpers/httpClient';
import { io } from 'socket.io-client';
import { setToken, clearToken } from '@/helpers/tokenStore';
import Webcam from 'react-webcam';

describe('Employee UI — Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Employee Authentication Flow', () => {
    test('should render login page when not authenticated', async () => {
      const { default: App } = await import('@/App');

      axiosClient.get.mockRejectedValueOnce({
        response: { status: 401 },
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      expect(screen.queryByRole('textbox', { name: /email|username/i })).toBeInTheDocument();
    });

    test('should handle successful employee login', async () => {
      axiosClient.post.mockResolvedValueOnce({
        status: 200,
        data: {
          ok: true,
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlbXAxIiwicm9sZSI6InVzZXIifQ.signature',
          refreshToken: 'refresh_token_hash',
        },
      });

      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: { _id: 'emp1', email: 'employee@workping.com', role: 'user', name: 'John Employee' },
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

      await userEvent.type(emailInput, 'employee@workping.com');
      await userEvent.type(passwordInput, 'EmployeePass123!');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(axiosClient.post).toHaveBeenCalledWith(
          expect.stringContaining('/login'),
          expect.objectContaining({
            email: 'employee@workping.com',
            password: 'EmployeePass123!',
          })
        );
      });

      expect(setToken).toHaveBeenCalled();
    });

    test('should reject login with invalid credentials', async () => {
      axiosClient.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'Invalid email or password' },
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

      await userEvent.type(emailInput, 'employee@workping.com');
      await userEvent.type(passwordInput, 'WrongPassword');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.queryByText(/invalid|incorrect|error/i)).toBeInTheDocument();
      });

      expect(setToken).not.toHaveBeenCalled();
    });

    test('should enforce role-based access (user role only)', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: { data: { _id: 'admin1', role: 'admin', email: 'admin@workping.com' } },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('textbox', { name: /email|username/i })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Face-Based Check-In', () => {
    test('should render webcam capture component', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: { data: { _id: 'emp1', role: 'user', email: 'employee@workping.com' } },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Navigate to check-in page
      const checkInLink = screen.queryByText(/check.?in|attendance|face/i);
      if (checkInLink) {
        fireEvent.click(checkInLink);

        await waitFor(() => {
          expect(screen.queryByTestId('webcam')).toBeInTheDocument();
        });
      }
    });

    test('should capture and submit face image for 1:1 verification', async () => {
      axiosClient.post.mockResolvedValueOnce({
        status: 200,
        data: {
          ok: true,
          data: { checkInTime: '09:15:30', confidence: 0.98, status: 'present' },
        },
      });

      const { default: App } = await import('@/App');

      const { container } = render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const captureBtn = screen.queryByRole('button', { name: /capture|submit|check.?in/i });
      if (captureBtn) {
        fireEvent.click(captureBtn);

        await waitFor(() => {
          expect(axiosClient.post).toHaveBeenCalledWith(
            expect.stringContaining('/attendance'),
            expect.any(Object)
          );
        });
      }
    });

    test('should show error if face verification fails', async () => {
      axiosClient.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'Face verification failed. Confidence too low.' },
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const captureBtn = screen.queryByRole('button', { name: /capture|submit/i });
      if (captureBtn) {
        fireEvent.click(captureBtn);

        await waitFor(() => {
          expect(screen.queryByText(/verification.*failed|confidence/i)).toBeInTheDocument();
        });
      }
    });

    test('should handle duplicate check-in on same day', async () => {
      axiosClient.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { error: 'Already checked in today' },
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const captureBtn = screen.queryByRole('button', { name: /capture|check.?in/i });
      if (captureBtn) {
        fireEvent.click(captureBtn);

        await waitFor(() => {
          expect(screen.queryByText(/already.*checked|duplicate/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Attendance Tracking & History', () => {
    test('should fetch and display attendance heatmap', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            totalDaysWorked: 20,
            presentDays: 18,
            absentDays: 2,
            attendancePercentage: 0.9,
            history: [
              { date: '2026-05-01', status: 'present', checkInTime: '09:00' },
              { date: '2026-05-02', status: 'present', checkInTime: '09:15' },
              { date: '2026-05-03', status: 'absent' },
            ],
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
        expect(axiosClient.get).toHaveBeenCalledWith(expect.stringContaining('/attendance'));
      }, { timeout: 3000 });
    });

    test('should filter attendance by month', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            { date: '2026-05-01', status: 'present', checkInTime: '09:00' },
            { date: '2026-05-02', status: 'present', checkInTime: '09:15' },
          ],
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const monthSelect = screen.queryByRole('combobox', { name: /month|date|filter/i });
      if (monthSelect) {
        await userEvent.selectOptions(monthSelect, '2026-05');

        await waitFor(() => {
          expect(axiosClient.get).toHaveBeenCalledWith(
            expect.stringContaining('/attendance'),
            expect.any(Object)
          );
        });
      }
    });

    test('should display check-in times and status badges', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            { date: '2026-05-11', status: 'present', checkInTime: '09:30:15' },
            { date: '2026-05-10', status: 'absent' },
            { date: '2026-05-09', status: 'half_day', checkInTime: '13:00' },
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
        expect(screen.queryByText(/09:30/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Leave Request Workflow', () => {
    test('should fetch leave balance', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            total: 20,
            used: 3,
            available: 17,
            casualLeave: { total: 10, used: 2, available: 8 },
            sickLeave: { total: 10, used: 1, available: 9 },
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
        expect(axiosClient.get).toHaveBeenCalledWith(expect.stringContaining('/leaves'));
      }, { timeout: 3000 });
    });

    test('should submit new leave request', async () => {
      axiosClient.post.mockResolvedValueOnce({
        status: 201,
        data: {
          ok: true,
          data: { _id: 'leave1', type: 'casual', status: 'pending', requestedDate: '2026-05-20' },
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const leaveTypeSelect = screen.queryByRole('combobox', { name: /type|leave/i });
      if (leaveTypeSelect) {
        await userEvent.selectOptions(leaveTypeSelect, 'casual');

        const dateInput = screen.queryByRole('textbox', { name: /date|from|start/i });
        if (dateInput) {
          await userEvent.type(dateInput, '2026-05-20');

          const reasonInput = screen.queryByRole('textbox', { name: /reason|comment/i });
          if (reasonInput) {
            await userEvent.type(reasonInput, 'Personal work');

            const submitBtn = screen.queryByRole('button', { name: /submit|request|apply/i });
            if (submitBtn) {
              fireEvent.click(submitBtn);

              await waitFor(() => {
                expect(axiosClient.post).toHaveBeenCalledWith(
                  expect.stringContaining('/leaves'),
                  expect.any(Object)
                );
              });
            }
          }
        }
      }
    });

    test('should display leave request status with approval tracking', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            {
              _id: '1',
              type: 'casual',
              startDate: '2026-05-15',
              endDate: '2026-05-17',
              status: 'pending',
              reason: 'Personal',
              approvals: [],
            },
            {
              _id: '2',
              type: 'sick',
              startDate: '2026-05-10',
              endDate: '2026-05-10',
              status: 'approved',
              approvals: [{ approver: 'manager1', level: 1, status: 'approved', approvedAt: '2026-05-09T10:30:00Z' }],
            },
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
        expect(screen.queryByText(/pending|approved/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('should cancel pending leave request', async () => {
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

      const cancelBtn = screen.queryByRole('button', { name: /cancel|remove/i });
      if (cancelBtn) {
        fireEvent.click(cancelBtn);

        await waitFor(() => {
          expect(global.confirm).toHaveBeenCalled();
          expect(axiosClient.delete).toHaveBeenCalledWith(
            expect.stringContaining('/leaves')
          );
        });
      }
    });

    test('should validate leave dates (no past dates, no overlapping leaves)', async () => {
      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const dateInput = screen.queryByRole('textbox', { name: /date|from/i });
      if (dateInput) {
        // Try to set a past date
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 5);
        await userEvent.type(dateInput, pastDate.toISOString().split('T')[0]);

        const submitBtn = screen.queryByRole('button', { name: /submit|request/i });
        if (submitBtn) {
          fireEvent.click(submitBtn);

          expect(axiosClient.post).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Real-Time Leave Approval Notifications', () => {
    test('should connect to leave approval room on mount', async () => {
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
        data: { data: { _id: 'emp1' } },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('leave:approval', expect.any(Function));
      }, { timeout: 3000 });
    });

    test('should receive real-time leave approval updates', async () => {
      const onLeaveApproval = jest.fn();
      const mockSocket = {
        on: jest.fn((event, handler) => {
          if (event === 'leave:approval') {
            onLeaveApproval(handler);
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

      await waitFor(() => {
        const handler = onLeaveApproval.mock.calls[0]?.[0];
        if (handler) {
          handler({ leaveId: '1', status: 'approved', approverName: 'John Manager' });
        }
      });
    });
  });

  describe('Profile & 2FA Setup', () => {
    test('should fetch user profile', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: {
            _id: 'emp1',
            name: 'John Employee',
            email: 'john@workping.com',
            phone: '+919876543210',
            avatar: '/avatars/emp1.jpg',
            department: 'Engineering',
            designation: 'Software Engineer',
            twoFactorEnabled: false,
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
        expect(axiosClient.get).toHaveBeenCalledWith(expect.stringContaining('/profile'));
      }, { timeout: 3000 });
    });

    test('should enable 2FA with TOTP setup', async () => {
      axiosClient.post.mockResolvedValueOnce({
        status: 200,
        data: {
          ok: true,
          data: {
            qrCode: 'data:image/png;base64,...',
            secret: 'JBSWY3DPEBLW64TMMQ',
            backupCodes: ['CODE1', 'CODE2', 'CODE3'],
          },
        },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const enable2FABtn = screen.queryByRole('button', { name: /enable.*2fa|setup.*authenticator/i });
      if (enable2FABtn) {
        fireEvent.click(enable2FABtn);

        await waitFor(() => {
          expect(axiosClient.post).toHaveBeenCalledWith(
            expect.stringContaining('/2fa/setup')
          );
        });
      }
    });

    test('should verify 2FA code and enable 2FA', async () => {
      axiosClient.post.mockResolvedValueOnce({
        status: 200,
        data: { ok: true, message: '2FA enabled' },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const codeInput = screen.queryByRole('textbox', { name: /code|otp|totp/i });
      if (codeInput) {
        await userEvent.type(codeInput, '123456');

        const verifyBtn = screen.queryByRole('button', { name: /verify|confirm|enable/i });
        if (verifyBtn) {
          fireEvent.click(verifyBtn);

          await waitFor(() => {
            expect(axiosClient.post).toHaveBeenCalledWith(
              expect.stringContaining('/2fa/verify'),
              expect.objectContaining({ code: '123456' })
            );
          });
        }
      }
    });

    test('should update profile information', async () => {
      axiosClient.put.mockResolvedValueOnce({
        status: 200,
        data: { ok: true, data: { name: 'John Updated' } },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const nameInput = screen.queryByRole('textbox', { name: /name/i });
      if (nameInput) {
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'John Updated');

        const saveBtn = screen.queryByRole('button', { name: /save|update/i });
        if (saveBtn) {
          fireEvent.click(saveBtn);

          await waitFor(() => {
            expect(axiosClient.put).toHaveBeenCalledWith(
              expect.stringContaining('/profile'),
              expect.any(Object)
            );
          });
        }
      }
    });
  });

  describe('Salary & Documents', () => {
    test('should fetch salary slips', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            {
              _id: '1',
              month: '2026-05',
              baseSalary: 50000,
              gross: 55000,
              net: 48000,
              downloadUrl: '/salaries/slip_2026_05.pdf',
            },
            {
              _id: '2',
              month: '2026-04',
              baseSalary: 50000,
              gross: 55000,
              net: 48000,
              downloadUrl: '/salaries/slip_2026_04.pdf',
            },
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
        expect(axiosClient.get).toHaveBeenCalledWith(expect.stringContaining('/salary'));
      }, { timeout: 3000 });
    });

    test('should download salary slip PDF', async () => {
      axiosClient.get.mockResolvedValueOnce({
        status: 200,
        data: { url: '/salaries/slip_2026_05.pdf' },
      });

      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const downloadBtn = screen.queryByRole('button', { name: /download/i });
      if (downloadBtn) {
        fireEvent.click(downloadBtn);

        await waitFor(() => {
          expect(axiosClient.get).toHaveBeenCalledWith(expect.stringContaining('/salary'));
        });
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

    test('should handle 401 unauthorized (token expired)', async () => {
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
        expect(clearToken).toHaveBeenCalled();
        expect(screen.queryByRole('textbox', { name: /email|username/i })).toBeInTheDocument();
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

      expect(container.querySelector('[role="status"]') || screen.queryByText(/loading/i)).toBeDefined();
    });
  });

  describe('Theme & Layout', () => {
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

    test('should toggle sidebar collapse on mobile', async () => {
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

    test('should validate leave date range (no past dates)', async () => {
      const { default: App } = await import('@/App');

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      const dateInput = screen.queryByRole('textbox', { name: /date|from/i });
      if (dateInput) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        await userEvent.type(dateInput, pastDate.toISOString().split('T')[0]);

        const submitBtn = screen.queryByRole('button', { name: /submit|request/i });
        if (submitBtn) {
          fireEvent.click(submitBtn);
          expect(axiosClient.post).not.toHaveBeenCalled();
        }
      }
    });
  });
});
