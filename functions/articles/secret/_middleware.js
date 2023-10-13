// TODO: トークンベースの認証に切り替えたい。

// 以下の記事が大変参考になりました🙇‍♂ ️
// https://zenn.dev/calldoctor_blog/articles/9e0398a0880931

const errorHandler = async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    return new Response(`${err.message}\n${err.stack}`, { status: 500 });
  }
};

const guardByBasicAuth = async ({ request, next, env }) => {
  if (!request.headers.has('Authorization')) {
    return new Response(
      'You need to login.',
      {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Input username and password"' },
      });
  }

  const [scheme, encoded] = request.headers.get('Authorization').split(' ');
  if (!encoded || scheme !== 'Basic') {
    return new Response(
      'Malformed authorization header.',
      {
        status: 400,
      },
    );
  }

  const buffer = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  const decoded = new TextDecoder().decode(buffer).normalize();
  const index = decoded.indexOf(':');

  if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
    return new Response(
      'Invalid authorization value.',
      {
        status: 400,
      },
    );
  }

  const username = decoded.substring(0, index);
  const password = decoded.substring(index + 1);
  if (username !== env.BASIC_AUTH_USERNAME && password !== env.BASIC_AUTH_PASSWORD) {
    return new Response(
      'Invalid username or password.',
      {
        status: 401,
      },
    );
  }
  return await next();
};

export const onRequest = [errorHandler, guardByBasicAuth];