export const relationOptions = [
  '爷爷', '奶奶', '外公', '外婆', '爸爸', '妈妈', '伯父', '伯母', '叔叔', '婶婶',
  '姑姑', '姑父', '舅舅', '舅妈', '姨妈', '姨父', '哥哥', '嫂子', '姐姐', '姐夫',
  '弟弟', '弟媳', '妹妹', '妹夫', '堂哥', '堂姐', '堂弟', '堂妹', '表哥', '表姐', '表弟', '表妹',
  '侄子', '侄女', '外甥', '外甥女', '儿子', '女儿', '其他亲戚'
];

export function branchFor(relation) {
  if (['爷爷', '奶奶', '伯父', '伯母', '叔叔', '婶婶', '堂哥', '堂姐', '堂弟', '堂妹', '侄子', '侄女'].includes(relation)) return '父系亲属';
  if (['外公', '外婆', '舅舅', '舅妈', '姨妈', '姨父', '表哥', '表姐', '表弟', '表妹', '外甥', '外甥女'].includes(relation)) return '母系亲属';
  if (['爸爸', '妈妈', '哥哥', '嫂子', '姐姐', '姐夫', '弟弟', '弟媳', '妹妹', '妹夫', '儿子', '女儿'].includes(relation)) return '核心家庭';
  return '其他亲戚';
}

export function generationFor(relation) {
  if (['爷爷', '奶奶', '外公', '外婆'].includes(relation)) return -2;
  if (['爸爸', '妈妈', '伯父', '伯母', '叔叔', '婶婶', '姑姑', '姑父', '舅舅', '舅妈', '姨妈', '姨父'].includes(relation)) return -1;
  if (['哥哥', '姐姐', '弟弟', '妹妹', '堂哥', '堂姐', '堂弟', '堂妹', '表哥', '表姐', '表弟', '表妹'].includes(relation)) return 0;
  if (['儿子', '女儿', '侄子', '侄女', '外甥', '外甥女'].includes(relation)) return 1;
  return 0;
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
