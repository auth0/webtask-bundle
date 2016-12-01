# Webtask Bundle: because sometimes one file isn't enough

Command line tool and node module for bundling your code to use on [webtask.io](https://webtask.io).

**Features**

* Organize your [webtask](https://webtask.io) code however you like
* Work with any modules available on [npm](https://www.npmjs.com/)
* Only bundle the modules that are not natively [available](https://tehsis.github.io/webtaskio-canirequire/) on the [webtask](https://webtask.io) platform

## Setup

```bash
$ npm i -g webtask-bundle
$ wt-bundle --watch --output ./build/webtask.js ./src/webtask.js
```

## Contributing

Just clone the repo, run `npm install` and then hack away.

## Issue reporting
 
If you have found a bug or if you have a feature request, please report them at
this repository issues section. Please do not report security vulnerabilities on
the public GitHub issue tracker. The 
[Responsible Disclosure Program](https://auth0.com/whitehat) details the 
procedure for disclosing security issues.

## License
 
MIT

## What is Auth0?
 
Auth0 helps you to:

* Add authentication with [multiple authentication sources](https://docs.auth0.com/identityproviders), either social like **Google, Facebook, Microsoft Account, LinkedIn, GitHub, Twitter, Box, Salesforce, amont others**, or enterprise identity systems like **Windows Azure AD, Google Apps, Active Directory, ADFS or any SAML Identity Provider**.
* Add authentication through more traditional **[username/password databases](https://docs.auth0.com/mysql-connection-tutorial)**.
* Add support for **[linking different user accounts](https://docs.auth0.com/link-accounts)** with the same user.
* Support for generating signed [Json Web Tokens](https://docs.auth0.com/jwt) to call your APIs and **flow the user identity** securely.
* Analytics of how, when and where users are logging in.
* Pull data from other sources and add it to the user profile, through [JavaScript rules](https://docs.auth0.com/rules).

## Create a free account in Auth0
 
1. Go to [Auth0](https://auth0.com) and click Sign Up.
2. Use Google, GitHub or Microsoft Account to login.

