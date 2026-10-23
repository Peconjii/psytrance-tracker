// The message of a failed save or send: which fields the backend refused and why, else its message, else the fallback
export function errorOf(err, fallback = 'Could not save. Try again.') {
    const data = err?.response?.data
    if (data?.errors) return 'Some fields need a fix: ' + Object.entries(data.errors).map(([field, why]) => `${field} ${why}`).join(', ')
    return data?.message || fallback
}
