// Returns the ?redirect= path to go to after logging in, or '/' if there isn't a safe one.
// Only paths inside this site are allowed (e.g. '/profile'), never 'https://...' or '//other-site.com',
// so a crafted login link can't send users to another website.
export const getSafeRedirect = (query) => {
  const redirect = query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }
  return '/'
}
