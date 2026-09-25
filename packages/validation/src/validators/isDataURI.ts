import tryToString from './util/tryToString';

const validMediaType = /^[a-z]+\/[a-z0-9\-+._]+$/i;

const validAttribute = /^[a-z-]+=[a-z0-9-]+$/i;

const validData = /^[a-z0-9!$&'()*+,;=\-._~:@/?%\s]*$/i;

export default function isDataURI(input: unknown): boolean {
  const s = tryToString(input);
  if (s === false) return false;
  const str: string = s;
  const data = str.split(',');
  if (data.length < 2) {
    return false;
  }
  const attributes = (data.shift() as string).trim().split(';');
  const schemeAndMediaType = attributes.shift() as string;
  if (schemeAndMediaType.slice(0, 5) !== 'data:') {
    return false;
  }
  const mediaType = schemeAndMediaType.slice(5);
  if (mediaType !== '' && !validMediaType.test(mediaType)) {
    return false;
  }
  for (let i = 0; i < attributes.length; i++) {
    if (
      !(i === attributes.length - 1 && attributes[i].toLowerCase() === 'base64') &&
      !validAttribute.test(attributes[i])
    ) {
      return false;
    }
  }
  for (const item of data) {
    if (!validData.test(item)) {
      return false;
    }
  }
  return true;
}
