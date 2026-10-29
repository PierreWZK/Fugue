// Temps nécessaire pour parcourir D pixels à partir de la vitesse v, avec une rampe linéaire a
// plafonnée à vmax (même loi que stepWorld). Sert à caler la musique sur la course.
export function timeToDistance(D, v, a, vmax) {
  if (D <= 0) return 0;
  if (v >= vmax || a <= 0) return D / vmax;
  const tCap = (vmax - v) / a;
  const dCap = v * tCap + (a * tCap * tCap) / 2;
  if (D <= dCap) return (Math.sqrt(v * v + 2 * a * D) - v) / a;
  return tCap + (D - dCap) / vmax;
}
