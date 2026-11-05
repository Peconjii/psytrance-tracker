// Your account: email confirmation, password reset, mail settings, deleting it
import api from './client.js'

export async function setEventReminders(enabled) {
    const response = await api.put('/api/me/reminders', { enabled })
    return response.data.enabled
}

// "Delete my account": the password again; everything that is the person's goes for good
export async function deleteAccount(password) {
    await api.post('/api/me/delete-account', { password })
}

// The Monday email with the next gigs of who the account follows; returns the new setting
export async function setWeeklyDigest(enabled) {
    const response = await api.put('/api/me/weekly-digest', { enabled })
    return response.data.enabled
}

// Both throw on failure; the backend's { message } is in err.response.data
export async function requestPasswordReset(email) {
    const response = await api.post('/api/auth/forgot-password', { email })
    return response.data
}

export async function resetPassword(token, newPassword) {
    const response = await api.post('/api/auth/reset-password', { token, newPassword })
    return response.data
}

// The link from the verification email: { username, message }. Throws (400) for a used or expired link.
export async function verifyEmail(token) {
    const response = await api.post('/api/auth/verify-email', { token })
    return response.data
}

// "Send the link again" for the logged-in account: { message }. 429 when a link was just sent.
export async function resendVerification() {
    const response = await api.post('/api/auth/resend-verification')
    return response.data
}
