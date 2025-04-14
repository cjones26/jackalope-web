/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as publicRouteImport } from './routes/(public)/route'
import { Route as protectedRouteImport } from './routes/(protected)/route'
import { Route as IndexImport } from './routes/index'
import { Route as publicAboutImport } from './routes/(public)/about'
import { Route as protectedSettingsImport } from './routes/(protected)/settings'
import { Route as publicauthSignUpImport } from './routes/(public)/(auth)/sign-up'
import { Route as publicauthSignInImport } from './routes/(public)/(auth)/sign-in'
import { Route as publicauthCheckEmailImport } from './routes/(public)/(auth)/check-email'

// Create/Update Routes

const publicRouteRoute = publicRouteImport.update({
  id: '/(public)',
  getParentRoute: () => rootRoute,
} as any)

const protectedRouteRoute = protectedRouteImport.update({
  id: '/(protected)',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const publicAboutRoute = publicAboutImport.update({
  id: '/about',
  path: '/about',
  getParentRoute: () => publicRouteRoute,
} as any)

const protectedSettingsRoute = protectedSettingsImport.update({
  id: '/settings',
  path: '/settings',
  getParentRoute: () => protectedRouteRoute,
} as any)

const publicauthSignUpRoute = publicauthSignUpImport.update({
  id: '/(auth)/sign-up',
  path: '/sign-up',
  getParentRoute: () => publicRouteRoute,
} as any)

const publicauthSignInRoute = publicauthSignInImport.update({
  id: '/(auth)/sign-in',
  path: '/sign-in',
  getParentRoute: () => publicRouteRoute,
} as any)

const publicauthCheckEmailRoute = publicauthCheckEmailImport.update({
  id: '/(auth)/check-email',
  path: '/check-email',
  getParentRoute: () => publicRouteRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/(protected)': {
      id: '/(protected)'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof protectedRouteImport
      parentRoute: typeof rootRoute
    }
    '/(public)': {
      id: '/(public)'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof publicRouteImport
      parentRoute: typeof rootRoute
    }
    '/(protected)/settings': {
      id: '/(protected)/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof protectedSettingsImport
      parentRoute: typeof protectedRouteImport
    }
    '/(public)/about': {
      id: '/(public)/about'
      path: '/about'
      fullPath: '/about'
      preLoaderRoute: typeof publicAboutImport
      parentRoute: typeof publicRouteImport
    }
    '/(public)/(auth)/check-email': {
      id: '/(public)/(auth)/check-email'
      path: '/check-email'
      fullPath: '/check-email'
      preLoaderRoute: typeof publicauthCheckEmailImport
      parentRoute: typeof publicRouteImport
    }
    '/(public)/(auth)/sign-in': {
      id: '/(public)/(auth)/sign-in'
      path: '/sign-in'
      fullPath: '/sign-in'
      preLoaderRoute: typeof publicauthSignInImport
      parentRoute: typeof publicRouteImport
    }
    '/(public)/(auth)/sign-up': {
      id: '/(public)/(auth)/sign-up'
      path: '/sign-up'
      fullPath: '/sign-up'
      preLoaderRoute: typeof publicauthSignUpImport
      parentRoute: typeof publicRouteImport
    }
  }
}

// Create and export the route tree

interface protectedRouteRouteChildren {
  protectedSettingsRoute: typeof protectedSettingsRoute
}

const protectedRouteRouteChildren: protectedRouteRouteChildren = {
  protectedSettingsRoute: protectedSettingsRoute,
}

const protectedRouteRouteWithChildren = protectedRouteRoute._addFileChildren(
  protectedRouteRouteChildren,
)

interface publicRouteRouteChildren {
  publicAboutRoute: typeof publicAboutRoute
  publicauthCheckEmailRoute: typeof publicauthCheckEmailRoute
  publicauthSignInRoute: typeof publicauthSignInRoute
  publicauthSignUpRoute: typeof publicauthSignUpRoute
}

const publicRouteRouteChildren: publicRouteRouteChildren = {
  publicAboutRoute: publicAboutRoute,
  publicauthCheckEmailRoute: publicauthCheckEmailRoute,
  publicauthSignInRoute: publicauthSignInRoute,
  publicauthSignUpRoute: publicauthSignUpRoute,
}

const publicRouteRouteWithChildren = publicRouteRoute._addFileChildren(
  publicRouteRouteChildren,
)

export interface FileRoutesByFullPath {
  '/': typeof publicRouteRouteWithChildren
  '/settings': typeof protectedSettingsRoute
  '/about': typeof publicAboutRoute
  '/check-email': typeof publicauthCheckEmailRoute
  '/sign-in': typeof publicauthSignInRoute
  '/sign-up': typeof publicauthSignUpRoute
}

export interface FileRoutesByTo {
  '/': typeof publicRouteRouteWithChildren
  '/settings': typeof protectedSettingsRoute
  '/about': typeof publicAboutRoute
  '/check-email': typeof publicauthCheckEmailRoute
  '/sign-in': typeof publicauthSignInRoute
  '/sign-up': typeof publicauthSignUpRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/(protected)': typeof protectedRouteRouteWithChildren
  '/(public)': typeof publicRouteRouteWithChildren
  '/(protected)/settings': typeof protectedSettingsRoute
  '/(public)/about': typeof publicAboutRoute
  '/(public)/(auth)/check-email': typeof publicauthCheckEmailRoute
  '/(public)/(auth)/sign-in': typeof publicauthSignInRoute
  '/(public)/(auth)/sign-up': typeof publicauthSignUpRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/settings'
    | '/about'
    | '/check-email'
    | '/sign-in'
    | '/sign-up'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/settings' | '/about' | '/check-email' | '/sign-in' | '/sign-up'
  id:
    | '__root__'
    | '/'
    | '/(protected)'
    | '/(public)'
    | '/(protected)/settings'
    | '/(public)/about'
    | '/(public)/(auth)/check-email'
    | '/(public)/(auth)/sign-in'
    | '/(public)/(auth)/sign-up'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  protectedRouteRoute: typeof protectedRouteRouteWithChildren
  publicRouteRoute: typeof publicRouteRouteWithChildren
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  protectedRouteRoute: protectedRouteRouteWithChildren,
  publicRouteRoute: publicRouteRouteWithChildren,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/(protected)",
        "/(public)"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/(protected)": {
      "filePath": "(protected)/route.tsx",
      "children": [
        "/(protected)/settings"
      ]
    },
    "/(public)": {
      "filePath": "(public)/route.tsx",
      "children": [
        "/(public)/about",
        "/(public)/(auth)/check-email",
        "/(public)/(auth)/sign-in",
        "/(public)/(auth)/sign-up"
      ]
    },
    "/(protected)/settings": {
      "filePath": "(protected)/settings.tsx",
      "parent": "/(protected)"
    },
    "/(public)/about": {
      "filePath": "(public)/about.tsx",
      "parent": "/(public)"
    },
    "/(public)/(auth)/check-email": {
      "filePath": "(public)/(auth)/check-email.tsx",
      "parent": "/(public)"
    },
    "/(public)/(auth)/sign-in": {
      "filePath": "(public)/(auth)/sign-in.tsx",
      "parent": "/(public)"
    },
    "/(public)/(auth)/sign-up": {
      "filePath": "(public)/(auth)/sign-up.tsx",
      "parent": "/(public)"
    }
  }
}
ROUTE_MANIFEST_END */
