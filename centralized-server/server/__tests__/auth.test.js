// globals.js must be the first import so globalThis.asyncHandler / AppError / redis
// are set before app.js evaluates the route/controller modules that reference them.
import '../globals.js'
import request from 'supertest'
import app from '../app/app.js'

// These tests cover validation-rejection paths on the admin auth routes.
// Those paths return 400 before any database access, so no live MongoDB is needed.
// Happy-path tests (successful register / login) require a live test database and
// belong in a separate integration suite.

describe('POST /api/admin/auth/register', () => {
    it('returns 400 when all fields are missing', async () => {
        const res = await request(app).post('/api/admin/auth/register').send({})
        expect(res.status).toBe(400)
        expect(res.body.type).toBe('error')
    })

    it('returns 400 when name is missing', async () => {
        const res = await request(app)
            .post('/api/admin/auth/register')
            .send({ email: 'user@example.com', password: 'Secure@Pass1', number: '9876543210' })
        expect(res.status).toBe(400)
    })

    it('returns 400 for invalid email format', async () => {
        const res = await request(app)
            .post('/api/admin/auth/register')
            .send({ name: 'Test User', email: 'not-an-email', password: 'Secure@Pass1', number: '9876543210' })
        expect(res.status).toBe(400)
    })

    it('returns 400 for password missing uppercase letter', async () => {
        const res = await request(app)
            .post('/api/admin/auth/register')
            .send({ name: 'Test User', email: 'user@example.com', password: 'weakpass1!', number: '9876543210' })
        expect(res.status).toBe(400)
    })

    it('returns 400 for password shorter than 8 characters', async () => {
        const res = await request(app)
            .post('/api/admin/auth/register')
            .send({ name: 'Test User', email: 'user@example.com', password: 'Ab1!', number: '9876543210' })
        expect(res.status).toBe(400)
    })

    it('returns 400 for invalid phone number', async () => {
        const res = await request(app)
            .post('/api/admin/auth/register')
            .send({ name: 'Test User', email: 'user@example.com', password: 'Secure@Pass1', number: '12345' })
        expect(res.status).toBe(400)
    })

    it('returns 400 for name containing digits', async () => {
        const res = await request(app)
            .post('/api/admin/auth/register')
            .send({ name: 'User123', email: 'user@example.com', password: 'Secure@Pass1', number: '9876543210' })
        expect(res.status).toBe(400)
    })
})

describe('POST /api/admin/auth/login', () => {
    it('returns 400 when all fields are missing', async () => {
        const res = await request(app).post('/api/admin/auth/login').send({})
        expect(res.status).toBe(400)
        expect(res.body.type).toBe('error')
    })

    it('returns 400 when password is missing', async () => {
        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ email: 'user@example.com' })
        expect(res.status).toBe(400)
    })

    it('returns 400 for invalid email format', async () => {
        const res = await request(app)
            .post('/api/admin/auth/login')
            .send({ email: 'not-valid-email', password: 'Secure@Pass1' })
        expect(res.status).toBe(400)
    })
})

describe('POST /api/admin/auth/forgot-password/send-otp', () => {
    it('returns 400 when email is missing', async () => {
        const res = await request(app)
            .post('/api/admin/auth/forgot-password/send-otp')
            .send({})
        expect(res.status).toBe(400)
    })

    it('returns 400 for invalid email format', async () => {
        const res = await request(app)
            .post('/api/admin/auth/forgot-password/send-otp')
            .send({ email: 'not-an-email' })
        expect(res.status).toBe(400)
    })
})

describe('POST /api/admin/auth/forgot-password/verify-otp', () => {
    it('returns 400 when all fields are missing', async () => {
        const res = await request(app)
            .post('/api/admin/auth/forgot-password/verify-otp')
            .send({})
        expect(res.status).toBe(400)
    })

    it('returns 400 when OTP is missing', async () => {
        const res = await request(app)
            .post('/api/admin/auth/forgot-password/verify-otp')
            .send({ email: 'user@example.com' })
        expect(res.status).toBe(400)
    })

    it('returns 400 for OTP with non-numeric characters', async () => {
        const res = await request(app)
            .post('/api/admin/auth/forgot-password/verify-otp')
            .send({ email: 'user@example.com', otp: 'abc123' })
        expect(res.status).toBe(400)
    })

    it('returns 400 for OTP shorter than 4 digits', async () => {
        const res = await request(app)
            .post('/api/admin/auth/forgot-password/verify-otp')
            .send({ email: 'user@example.com', otp: '123' })
        expect(res.status).toBe(400)
    })
})

describe('POST /api/admin/auth/forgot-password/reset', () => {
    it('returns 400 when all fields are missing', async () => {
        const res = await request(app)
            .post('/api/admin/auth/forgot-password/reset')
            .send({})
        expect(res.status).toBe(400)
    })

    it('returns 400 for weak new password', async () => {
        const res = await request(app)
            .post('/api/admin/auth/forgot-password/reset')
            .send({ email: 'user@example.com', otp: '123456', newPassword: 'weak' })
        expect(res.status).toBe(400)
    })
})
