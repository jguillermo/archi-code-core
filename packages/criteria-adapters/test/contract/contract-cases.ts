import { Criteria, CriteriaInput } from '@archi-code/criteria';
import { ContractDocument, contractDay } from './contract-documents';

export interface CriteriaContractCase {
  readonly name: string;
  readonly criteria: Criteria<ContractDocument>;
  readonly expectedIds: readonly string[];
  readonly expectedTotal?: number;
}

function scenario(
  name: string,
  input: CriteriaInput<ContractDocument>,
  expectedIds: readonly string[],
  expectedTotal?: number,
): CriteriaContractCase {
  return Object.freeze({
    name,
    criteria: Criteria.create<ContractDocument>(input),
    expectedIds: Object.freeze([...expectedIds]),
    ...(expectedTotal === undefined ? {} : { expectedTotal }),
  });
}

function rawScenario(
  name: string,
  filter: readonly unknown[],
  expectedIds: readonly string[],
): CriteriaContractCase {
  return Object.freeze({
    name,
    criteria: Criteria.fromJSON<ContractDocument>({ v: 1, f: filter }),
    expectedIds: Object.freeze([...expectedIds]),
  });
}

const ALL = ['d01', 'd02', 'd03', 'd04', 'd05', 'd06', 'd07', 'd08', 'd09'];

export const CRITERIA_CONTRACT_CASES: readonly CriteriaContractCase[] = Object.freeze([
  scenario('no filter returns every document', {}, ALL),
  scenario('eq on a string', { where: { status: { eq: 'active' } } }, ['d01', 'd04', 'd05', 'd08']),
  scenario('a plain value means eq', { where: { status: 'pending' } }, ['d02', 'd06', 'd09']),
  scenario('ne also matches missing and null', { where: { status: { ne: 'active' } } }, [
    'd02',
    'd03',
    'd06',
    'd07',
    'd09',
  ]),
  scenario('eq on a number', { where: { age: 30 } }, ['d01', 'd08']),
  scenario('ne on a number matches missing and null', { where: { age: { ne: 30 } } }, [
    'd02',
    'd03',
    'd04',
    'd05',
    'd06',
    'd07',
    'd09',
  ]),
  scenario('gt never matches missing or null', { where: { age: { gt: 30 } } }, [
    'd05',
    'd07',
    'd09',
  ]),
  scenario('gte', { where: { age: { gte: 30 } } }, ['d01', 'd05', 'd07', 'd08', 'd09']),
  scenario('lt', { where: { age: { lt: 25 } } }, ['d06']),
  scenario('lte', { where: { age: { lte: 25 } } }, ['d02', 'd06']),
  scenario('between includes both ends', { where: { age: { between: [25, 41] } } }, [
    'd01',
    'd02',
    'd05',
    'd08',
  ]),
  scenario(
    'two operators on one field are joined with AND',
    { where: { age: { gt: 18, lt: 41 } } },
    ['d01', 'd02', 'd08'],
  ),
  scenario('in', { where: { status: { in: ['blocked', 'pending'] } } }, [
    'd02',
    'd03',
    'd06',
    'd07',
    'd09',
  ]),
  scenario('nin', { where: { status: { nin: ['active', 'pending'] } } }, ['d03', 'd07']),
  scenario('nin matches missing and null', { where: { age: { nin: [30] } } }, [
    'd02',
    'd03',
    'd04',
    'd05',
    'd06',
    'd07',
    'd09',
  ]),
  scenario('isNull true matches null and missing', { where: { age: { isNull: true } } }, [
    'd03',
    'd04',
  ]),
  scenario('isNull false', { where: { age: { isNull: false } } }, [
    'd01',
    'd02',
    'd05',
    'd06',
    'd07',
    'd08',
    'd09',
  ]),
  scenario('a null value means isNull', { where: { age: null } }, ['d03', 'd04']),
  scenario('eq null matches null and missing', { where: { email: { eq: null } } }, [
    'd02',
    'd03',
    'd07',
  ]),
  scenario('contains is case sensitive by default', { where: { name: { contains: 'an' } } }, [
    'd02',
  ]),
  scenario('contains insensitive', { where: { name: { contains: 'an', mode: 'insensitive' } } }, [
    'd01',
    'd02',
  ]),
  scenario(
    'startsWith insensitive',
    { where: { name: { startsWith: 'a', mode: 'insensitive' } } },
    ['d01', 'd02', 'd08'],
  ),
  scenario(
    'startsWith insensitive with an accented letter',
    { where: { name: { startsWith: 'á', mode: 'insensitive' } } },
    ['d05'],
  ),
  scenario('endsWith', { where: { name: { endsWith: 'o' } } }, ['d03', 'd06']),
  scenario('endsWith insensitive', { where: { name: { endsWith: 'o', mode: 'insensitive' } } }, [
    'd03',
    'd05',
    'd06',
  ]),
  scenario('text is literal, not a pattern', { where: { name: { contains: '.b*' } } }, ['d08']),
  scenario('eq on a boolean', { where: { active: true } }, [
    'd01',
    'd03',
    'd05',
    'd06',
    'd08',
    'd09',
  ]),
  scenario('false is a value, not a missing filter', { where: { active: false } }, [
    'd02',
    'd04',
    'd07',
  ]),
  scenario('eq on a date', { where: { createdAt: contractDay('2024-01-10') } }, ['d01', 'd06']),
  scenario('gt on a date', { where: { createdAt: { gt: contractDay('2024-03-01') } } }, [
    'd03',
    'd05',
    'd08',
    'd09',
  ]),
  scenario(
    'between dates',
    { where: { createdAt: { between: [contractDay('2024-01-01'), contractDay('2024-02-28')] } } },
    ['d01', 'd02', 'd06'],
  ),
  scenario('lt on a date', { where: { createdAt: { lt: contractDay('2024-01-01') } } }, [
    'd04',
    'd07',
  ]),
  scenario(
    'in with dates',
    { where: { createdAt: { in: [contractDay('2024-01-10'), contractDay('2022-06-01')] } } },
    ['d01', 'd06', 'd07'],
  ),
  scenario('has', { where: { tags: { has: 'vip' } } }, ['d01', 'd04', 'd05', 'd09']),
  scenario('hasSome', { where: { tags: { hasSome: ['pro', 'x'] } } }, ['d05', 'd06', 'd08']),
  scenario('hasEvery', { where: { tags: { hasEvery: ['vip', 'new'] } } }, ['d01']),
  scenario('isEmpty true does not match a missing list', { where: { tags: { isEmpty: true } } }, [
    'd03',
  ]),
  scenario('isEmpty false', { where: { tags: { isEmpty: false } } }, [
    'd01',
    'd02',
    'd04',
    'd05',
    'd06',
    'd08',
    'd09',
  ]),
  scenario('nested field', { where: { 'address.city': 'Huelva' } }, ['d01', 'd03', 'd08']),
  scenario(
    'nested field insensitive',
    { where: { 'address.city': { startsWith: 'h', mode: 'insensitive' } } },
    ['d01', 'd03', 'd06', 'd08'],
  ),
  scenario('strings compare by code point', { where: { 'address.zip': { gte: '41000' } } }, [
    'd02',
    'd07',
  ]),
  scenario('a missing parent is null', { where: { 'address.city': { isNull: true } } }, ['d04']),
  scenario('fields are joined with AND', { where: { status: 'active', age: { gte: 30 } } }, [
    'd01',
    'd05',
    'd08',
  ]),
  scenario('OR', { where: { OR: [{ status: 'blocked' }, { age: { lt: 20 } }] } }, [
    'd03',
    'd06',
    'd07',
  ]),
  scenario('NOT', { where: { NOT: { status: 'active' } } }, ['d02', 'd03', 'd06', 'd07', 'd09']),
  scenario(
    'NOT of a comparison matches missing and null',
    { where: { NOT: { age: { gt: 30 } } } },
    ['d01', 'd02', 'd03', 'd04', 'd06', 'd08'],
  ),
  scenario(
    'nested AND, OR and NOT',
    {
      where: {
        AND: [
          { OR: [{ status: 'active' }, { status: 'pending' }] },
          { NOT: { tags: { has: 'vip' } } },
        ],
      },
    },
    ['d02', 'd06', 'd08'],
  ),
  scenario(
    'order by string puts null first and compares code units',
    { orderBy: { name: 'asc' } },
    ['d09', 'd01', 'd03', 'd04', 'd07', 'd08', 'd02', 'd06', 'd05'],
  ),
  scenario('order desc puts null and missing last', { orderBy: [{ age: 'desc' }, { id: 'asc' }] }, [
    'd07',
    'd09',
    'd05',
    'd01',
    'd08',
    'd02',
    'd06',
    'd03',
    'd04',
  ]),
  scenario('order by date then id desc', { orderBy: [{ createdAt: 'asc' }, { id: 'desc' }] }, [
    'd07',
    'd04',
    'd06',
    'd01',
    'd02',
    'd03',
    'd05',
    'd08',
    'd09',
  ]),
  scenario('order by boolean puts false first', { orderBy: [{ active: 'asc' }, { id: 'asc' }] }, [
    'd02',
    'd04',
    'd07',
    'd01',
    'd03',
    'd05',
    'd06',
    'd08',
    'd09',
  ]),
  scenario('order by a nested field', { orderBy: [{ 'address.city': 'asc' }, { id: 'asc' }] }, [
    'd04',
    'd09',
    'd01',
    'd03',
    'd08',
    'd05',
    'd02',
    'd07',
    'd06',
  ]),
  scenario(
    'limit and offset',
    { orderBy: { id: 'asc' }, limit: 3, offset: 3 },
    ['d04', 'd05', 'd06'],
    9,
  ),
  scenario(
    'total counts every match before paginating',
    { where: { status: 'active' }, orderBy: { id: 'asc' }, limit: 2, offset: 1 },
    ['d04', 'd05'],
    4,
  ),
  scenario('offset past the end', { orderBy: { id: 'asc' }, limit: 5, offset: 20 }, [], 9),
  scenario('offset without limit', { orderBy: { id: 'asc' }, offset: 7 }, ['d08', 'd09']),
  scenario(
    'strings order by code point, astral characters last',
    { orderBy: [{ title: 'asc' }, { id: 'asc' }] },
    ['d09', 'd04', 'd08', 'd03', 'd05', 'd06', 'd07', 'd01', 'd02'],
  ),
  scenario(
    'a range above U+FF00 includes astral characters',
    { where: { title: { gt: '\uFF00' } } },
    ['d01', 'd02'],
  ),
  scenario(
    'a range below an astral character includes U+FF00 and above',
    { where: { title: { lt: '\u{1F600}' } } },
    ['d01', 'd03', 'd04', 'd05', 'd06', 'd07', 'd08'],
  ),
  scenario(
    'a sorted page puts astral characters after U+FF00 and above',
    { where: { title: { gte: 'A' } }, orderBy: { title: 'desc' }, limit: 1 },
    ['d02'],
  ),
  scenario(
    'insensitive text uses Unicode simple case folding',
    { where: { title: { contains: '\u03A9MEGA', mode: 'insensitive' } } },
    ['d05', 'd06'],
  ),
  scenario(
    'insensitive text folds the Kelvin sign to k',
    { where: { title: { startsWith: 'k', mode: 'insensitive' } } },
    ['d07'],
  ),
  scenario(
    'insensitive text does not expand special casings',
    { where: { title: { startsWith: 'i\u0307stanbul', mode: 'insensitive' } } },
    [],
  ),
  scenario(
    'insensitive text does not fold sharp s into ss',
    { where: { title: { contains: 'SS', mode: 'insensitive' } } },
    [],
  ),
  rawScenario('a scalar comparison never looks inside a list', ['eq', 'tags', 'vip'], []),
  rawScenario(
    'ne on a list field only matches where the list is missing',
    ['ne', 'tags', 'vip'],
    ['d07'],
  ),
  rawScenario('in never looks inside a list', ['in', 'tags', ['vip', 'pro']], []),
  rawScenario(
    'nin on a list field only matches where the list is missing',
    ['nin', 'tags', ['vip']],
    ['d07'],
  ),
  rawScenario('text never looks inside a list', ['ct', 'tags', 'vi', 1], []),
  rawScenario('a range never looks inside a list', ['gt', 'tags', 'a'], []),
  rawScenario('a path never crosses a list of objects', ['eq', 'lines.sku', 'A'], []),
  rawScenario('a path across a list reads as null', ['nu', 'lines.sku', 1], ALL),
  rawScenario('a list element is read by its index', ['eq', 'lines.0.sku', 'A'], ['d01']),
  rawScenario('inherited properties read as missing', ['nu', 'toString', 0], []),
  scenario('a list field is not null', { where: { tags: { isNull: false } } }, [
    'd01',
    'd02',
    'd03',
    'd04',
    'd05',
    'd06',
    'd08',
    'd09',
  ]),
]);
