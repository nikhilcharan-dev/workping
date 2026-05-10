import {
    validateEmail,
    validatePassword,
    validatePhone,
    validateName,
    validateObjectId,
    validateOTP,
    validateRequiredFields,
    validateDate,
    validateEnum,
    validateNumber,
    validateEmployeeId,
    validateString,
    validateArray,
} from '../utils/validators.js'

describe('validateEmail', () => {
    it('rejects undefined', () => expect(validateEmail(undefined).valid).toBe(false))
    it('rejects empty string', () => expect(validateEmail('').valid).toBe(false))
    it('rejects missing @', () => expect(validateEmail('notanemail').valid).toBe(false))
    it('rejects missing domain', () => expect(validateEmail('user@').valid).toBe(false))
    it('rejects missing local part', () => expect(validateEmail('@domain.com').valid).toBe(false))

    it('rejects email exceeding 254 characters', () => {
        const long = 'a'.repeat(244) + '@example.com'
        expect(validateEmail(long).valid).toBe(false)
    })

    it('rejects local part exceeding 64 characters', () => {
        const local = 'a'.repeat(65)
        expect(validateEmail(`${local}@example.com`).valid).toBe(false)
    })

    it('accepts valid email and normalizes to lowercase', () => {
        const result = validateEmail('Test.User@EXAMPLE.COM')
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe('test.user@example.com')
    })

    it('accepts subdomain email', () => {
        expect(validateEmail('user@mail.company.org').valid).toBe(true)
    })
})

describe('validatePassword', () => {
    it('rejects undefined', () => expect(validatePassword(undefined).valid).toBe(false))
    it('rejects empty string', () => expect(validatePassword('').valid).toBe(false))

    it('rejects password shorter than 8 characters', () => {
        expect(validatePassword('Ab1!').valid).toBe(false)
    })

    it('rejects password longer than 128 characters', () => {
        const long = 'Aa1!' + 'x'.repeat(126)
        expect(validatePassword(long).valid).toBe(false)
    })

    it('rejects password without uppercase letter', () => {
        expect(validatePassword('lowercase1!').valid).toBe(false)
    })

    it('rejects password without lowercase letter', () => {
        expect(validatePassword('UPPERCASE1!').valid).toBe(false)
    })

    it('rejects password without a number', () => {
        expect(validatePassword('NoNumber!!').valid).toBe(false)
    })

    it('rejects password without a special character', () => {
        expect(validatePassword('NoSpecial1').valid).toBe(false)
    })

    it('accepts a valid strong password', () => {
        expect(validatePassword('Secure@Pass1').valid).toBe(true)
    })

    it('accepts password with various special characters', () => {
        expect(validatePassword('MyP@ss#1').valid).toBe(true)
        expect(validatePassword('Hello$World9').valid).toBe(true)
    })
})

describe('validatePhone', () => {
    it('rejects undefined', () => expect(validatePhone(undefined).valid).toBe(false))
    it('rejects empty string', () => expect(validatePhone('').valid).toBe(false))

    it('rejects phone with fewer than 10 digits', () => {
        expect(validatePhone('912345').valid).toBe(false)
    })

    it('rejects phone with more than 10 digits', () => {
        expect(validatePhone('12345678901').valid).toBe(false)
    })

    it('accepts valid 10-digit number and strips non-digit characters', () => {
        const result = validatePhone('98765-43210')
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe('9876543210')
    })

    it('accepts phone with spaces', () => {
        const result = validatePhone('9876 543210')
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe('9876543210')
    })
})

describe('validateName', () => {
    it('rejects undefined', () => expect(validateName(undefined).valid).toBe(false))
    it('rejects empty string', () => expect(validateName('').valid).toBe(false))

    it('rejects single character', () => {
        expect(validateName('A').valid).toBe(false)
    })

    it('rejects name exceeding 100 characters', () => {
        expect(validateName('A'.repeat(101)).valid).toBe(false)
    })

    it('rejects name with digits', () => {
        expect(validateName('John123').valid).toBe(false)
    })

    it('rejects name with special characters other than - \' .', () => {
        expect(validateName('John@Doe').valid).toBe(false)
        expect(validateName('Jane_Doe').valid).toBe(false)
    })

    it('accepts name with hyphen', () => {
        expect(validateName('Mary-Jane').valid).toBe(true)
    })

    it("accepts name with apostrophe", () => {
        expect(validateName("O'Brien").valid).toBe(true)
    })

    it('accepts name with dot (e.g. honorific)', () => {
        expect(validateName('Dr. Smith').valid).toBe(true)
    })

    it('trims whitespace and returns normalized value', () => {
        const result = validateName('  Alice  ')
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe('Alice')
    })
})

describe('validateOTP', () => {
    it('rejects undefined', () => expect(validateOTP(undefined).valid).toBe(false))
    it('rejects empty string', () => expect(validateOTP('').valid).toBe(false))

    it('rejects OTP with fewer than 4 digits', () => {
        expect(validateOTP('123').valid).toBe(false)
    })

    it('rejects OTP with more than 6 digits', () => {
        expect(validateOTP('1234567').valid).toBe(false)
    })

    it('rejects non-numeric OTP', () => {
        expect(validateOTP('12ab56').valid).toBe(false)
    })

    it('accepts 4-digit OTP', () => expect(validateOTP('1234').valid).toBe(true))
    it('accepts 5-digit OTP', () => expect(validateOTP('12345').valid).toBe(true))
    it('accepts 6-digit OTP', () => expect(validateOTP('123456').valid).toBe(true))
})

describe('validateObjectId', () => {
    it('rejects undefined', () => expect(validateObjectId(undefined).valid).toBe(false))
    it('rejects empty string', () => expect(validateObjectId('').valid).toBe(false))
    it('rejects non-hex string', () => expect(validateObjectId('not-an-id').valid).toBe(false))
    it('rejects short hex string', () => expect(validateObjectId('507f1f77bcf').valid).toBe(false))

    it('accepts a valid 24-character hex ObjectId', () => {
        expect(validateObjectId('507f1f77bcf86cd799439011').valid).toBe(true)
    })

    it('includes custom field name in error message', () => {
        const result = validateObjectId(undefined, 'organizationId')
        expect(result.error).toContain('organizationId')
    })
})

describe('validateRequiredFields', () => {
    it('returns valid when all fields are present', () => {
        const result = validateRequiredFields({ a: '1', b: '2', c: '3' }, ['a', 'b', 'c'])
        expect(result.valid).toBe(true)
    })

    it('returns error listing every missing field', () => {
        const result = validateRequiredFields({ a: '1' }, ['a', 'b', 'c'])
        expect(result.valid).toBe(false)
        expect(result.error).toContain('b')
        expect(result.error).toContain('c')
    })

    it('treats empty string as missing', () => {
        expect(validateRequiredFields({ email: '' }, ['email']).valid).toBe(false)
    })

    it('treats null as missing', () => {
        expect(validateRequiredFields({ email: null }, ['email']).valid).toBe(false)
    })

    it('treats undefined as missing', () => {
        expect(validateRequiredFields({}, ['email']).valid).toBe(false)
    })

    it('returns valid for empty required-fields list', () => {
        expect(validateRequiredFields({ a: '1' }, []).valid).toBe(true)
    })
})

describe('validateEnum', () => {
    const roles = ['admin', 'user', 'manager']

    it('rejects undefined', () => expect(validateEnum(undefined, roles, 'role').valid).toBe(false))
    it('rejects value not in enum', () => expect(validateEnum('superuser', roles, 'role').valid).toBe(false))

    it('accepts case-insensitive match and normalizes to lowercase', () => {
        const result = validateEnum('ADMIN', roles, 'role')
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe('admin')
    })

    it('includes field name in error message', () => {
        const result = validateEnum('unknown', roles, 'userRole')
        expect(result.error).toContain('userRole')
    })
})

describe('validateNumber', () => {
    it('returns valid when value is absent and not required', () => {
        expect(validateNumber(undefined, 'count', {}).valid).toBe(true)
    })

    it('rejects non-numeric string when required', () => {
        expect(validateNumber('abc', 'count', { required: true }).valid).toBe(false)
    })

    it('rejects value below min', () => {
        expect(validateNumber(5, 'age', { min: 10 }).valid).toBe(false)
    })

    it('rejects value above max', () => {
        expect(validateNumber(200, 'age', { max: 120 }).valid).toBe(false)
    })

    it('rejects non-integer when integer:true', () => {
        expect(validateNumber(3.5, 'count', { integer: true }).valid).toBe(false)
    })

    it('accepts numeric string and returns normalized number', () => {
        const result = validateNumber('42', 'count', { min: 1, max: 100 })
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe(42)
    })
})

describe('validateDate', () => {
    it('rejects missing date when required (default)', () => {
        expect(validateDate(undefined).valid).toBe(false)
    })

    it('returns valid when date is absent and required:false', () => {
        expect(validateDate(undefined, 'date', { required: false }).valid).toBe(true)
    })

    it('rejects invalid date string', () => {
        expect(validateDate('not-a-date').valid).toBe(false)
    })

    it('accepts ISO date string', () => {
        expect(validateDate('2024-06-15').valid).toBe(true)
    })

    it('accepts DD-MM-YYYY format', () => {
        expect(validateDate('15-06-2024').valid).toBe(true)
    })

    it('rejects future date when noFuture:true', () => {
        const futureDate = new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0]
        expect(validateDate(futureDate, 'dob', { noFuture: true }).valid).toBe(false)
    })
})

describe('validateEmployeeId', () => {
    it('rejects undefined', () => expect(validateEmployeeId(undefined).valid).toBe(false))
    it('rejects ID shorter than 3 characters', () => expect(validateEmployeeId('AB').valid).toBe(false))
    it('rejects ID longer than 20 characters', () => expect(validateEmployeeId('A'.repeat(21)).valid).toBe(false))

    it('rejects ID with spaces or special characters', () => {
        expect(validateEmployeeId('EMP 001').valid).toBe(false)
        expect(validateEmployeeId('EMP@001').valid).toBe(false)
    })

    it('accepts alphanumeric ID and normalizes to uppercase', () => {
        const result = validateEmployeeId('emp-001')
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe('EMP-001')
    })
})

describe('validateString', () => {
    it('returns valid when value absent and not required', () => {
        expect(validateString(undefined, 'field', {}).valid).toBe(true)
    })

    it('rejects value below minLength', () => {
        expect(validateString('hi', 'bio', { minLength: 10 }).valid).toBe(false)
    })

    it('rejects value above maxLength', () => {
        expect(validateString('x'.repeat(300), 'bio', { maxLength: 250 }).valid).toBe(false)
    })

    it('accepts valid string within bounds', () => {
        const result = validateString('  hello  ', 'tag', { minLength: 3, maxLength: 20 })
        expect(result.valid).toBe(true)
        expect(result.normalized).toBe('hello')
    })
})

describe('validateArray', () => {
    it('returns valid when absent and not required', () => {
        expect(validateArray(undefined, 'tags', {}).valid).toBe(true)
    })

    it('rejects non-array value', () => {
        expect(validateArray('string', 'tags', {}).valid).toBe(false)
    })

    it('rejects array below minLength', () => {
        expect(validateArray([], 'tags', { minLength: 1 }).valid).toBe(false)
    })

    it('rejects array above maxLength', () => {
        expect(validateArray([1, 2, 3], 'tags', { maxLength: 2 }).valid).toBe(false)
    })

    it('rejects array with duplicate items when uniqueItems:true', () => {
        expect(validateArray([1, 1, 2], 'ids', { uniqueItems: true }).valid).toBe(false)
    })

    it('accepts valid unique array', () => {
        expect(validateArray([1, 2, 3], 'ids', { uniqueItems: true }).valid).toBe(true)
    })
})
