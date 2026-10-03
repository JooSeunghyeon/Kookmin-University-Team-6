const ADJECTIVES = [
  "졸린",
  "용감한",
  "배고픈",
  "느긋한",
  "성실한",
  "수줍은",
  "씩씩한",
  "똑똑한",
  "엉뚱한",
  "다정한",
  "조용한",
  "재빠른",
  "활발한",
  "차분한",
  "유쾌한",
];

const ANIMALS = [
  "수달",
  "다람쥐",
  "너구리",
  "고양이",
  "햄스터",
  "부엉이",
  "토끼",
  "펭귄",
  "여우",
  "고슴도치",
  "두루미",
  "오리",
  "비버",
  "앵무새",
  "코알라",
];

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export function generateRandomNickname(): string {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const animal = ANIMALS[randomInt(ANIMALS.length)];
  const number = randomInt(100);
  return `${adjective} ${animal} ${number}`;
}
