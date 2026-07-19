/**
 * 亲属关系分类与辈分映射
 * 使用静态查找表实现 O(1) 查找，替代原 Array.includes 的 O(n) 查找
 */

export const relationOptions = [
  '爷爷', '奶奶', '外公', '外婆', '爸爸', '妈妈', '伯父', '伯母', '叔叔', '婶婶',
  '姑姑', '姑父', '舅舅', '舅妈', '姨妈', '姨父', '哥哥', '嫂子', '姐姐', '姐夫',
  '弟弟', '弟媳', '妹妹', '妹夫', '堂哥', '堂姐', '堂弟', '堂妹', '表哥', '表姐', '表弟', '表妹',
  '侄子', '侄女', '外甥', '外甥女', '儿子', '女儿', '其他亲戚'
];

// relation → branch 映射（与原 branchFor 逻辑一致）
const BRANCH_MAP = {
  爷爷: '父系亲属', 奶奶: '父系亲属', 伯父: '父系亲属', 伯母: '父系亲属',
  叔叔: '父系亲属', 婶婶: '父系亲属', 堂哥: '父系亲属', 堂姐: '父系亲属',
  堂弟: '父系亲属', 堂妹: '父系亲属', 侄子: '父系亲属', 侄女: '父系亲属',
  外公: '母系亲属', 外婆: '母系亲属', 舅舅: '母系亲属', 舅妈: '母系亲属',
  姨妈: '母系亲属', 姨父: '母系亲属', 表哥: '母系亲属', 表姐: '母系亲属',
  表弟: '母系亲属', 表妹: '母系亲属', 外甥: '母系亲属', 外甥女: '母系亲属',
  爸爸: '核心家庭', 妈妈: '核心家庭', 哥哥: '核心家庭', 嫂子: '核心家庭',
  姐姐: '核心家庭', 姐夫: '核心家庭', 弟弟: '核心家庭', 弟媳: '核心家庭',
  妹妹: '核心家庭', 妹夫: '核心家庭', 儿子: '核心家庭', 女儿: '核心家庭',
};

// relation → generation 映射（与原 generationFor 逻辑一致）
const GEN_MAP = {
  爷爷: -2, 奶奶: -2, 外公: -2, 外婆: -2,
  爸爸: -1, 妈妈: -1, 伯父: -1, 伯母: -1, 叔叔: -1, 婶婶: -1,
  姑姑: -1, 姑父: -1, 舅舅: -1, 舅妈: -1, 姨妈: -1, 姨父: -1,
  哥哥: 0, 姐姐: 0, 弟弟: 0, 妹妹: 0,
  堂哥: 0, 堂姐: 0, 堂弟: 0, 堂妹: 0,
  表哥: 0, 表姐: 0, 表弟: 0, 表妹: 0,
  儿子: 1, 女儿: 1, 侄子: 1, 侄女: 1, 外甥: 1, 外甥女: 1,
};

export function branchFor(relation) {
  return BRANCH_MAP[relation] ?? '其他亲戚';
}

export function generationFor(relation) {
  return GEN_MAP[relation] ?? 0;
}

export function groupVisitors(visitors) {
  return visitors.reduce((tree, visitor) => {
    const branch = branchFor(visitor.relation);
    if (!tree[branch]) tree[branch] = {};
    if (!tree[branch][visitor.relation]) tree[branch][visitor.relation] = [];
    tree[branch][visitor.relation].push(visitor);
    return tree;
  }, {});
}

export function groupByGeneration(visitors) {
  const gens = {};
  for (const v of visitors) {
    const g = generationFor(v.relation);
    if (!gens[g]) gens[g] = [];
    gens[g].push(v);
  }
  return Object.entries(gens).sort(([a], [b]) => Number(a) - Number(b));
}

export const generationLabels = {
  [-2]: '祖辈',
  [-1]: '父辈',
  [0]: '同辈',
  [1]: '子辈',
};
