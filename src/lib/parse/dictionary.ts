import { normalizeName } from "./normalize";

/**
 * Bilingual (PT + EN) keyword → category dictionary. Words are listed raw and
 * normalized once at module load (accent-folded + singularized), so matching is
 * consistent with item identity. Not exhaustive — a good everyday baseline that
 * the learned rules (categorize_rules) refine per user over time.
 */
const RAW: Record<string, string[]> = {
  produce: [
    "apple", "maca", "banana", "orange", "laranja", "lemon", "limao", "lime", "lima",
    "pear", "pera", "peach", "pessego", "grape", "uva", "strawberry", "morango",
    "melon", "melao", "watermelon", "melancia", "pineapple", "ananas", "abacaxi",
    "mango", "manga", "kiwi", "cherry", "cereja", "plum", "ameixa", "avocado", "abacate",
    "tomato", "tomate", "potato", "batata", "onion", "cebola", "garlic", "alho",
    "carrot", "cenoura", "lettuce", "alface", "spinach", "espinafre", "broccoli", "brocolos",
    "cauliflower", "couve flor", "cabbage", "couve", "pepper", "pimento", "cucumber", "pepino",
    "zucchini", "courgette", "curgete", "eggplant", "beringela", "mushroom", "cogumelo",
    "corn", "milho", "peas", "ervilha", "green beans", "feijao verde", "leek", "alho frances",
    "celery", "aipo", "ginger", "gengibre", "parsley", "salsa", "coriander", "coentro",
    "basil", "manjericao", "fruit", "fruta", "salad", "salada",
  ],
  dairy: [
    "milk", "leite", "cheese", "queijo", "butter", "manteiga", "yogurt", "yoghurt", "iogurte",
    "cream", "natas", "egg", "ovo", "margarine", "margarina", "curd", "requeijao",
    "mozzarella", "mozarela", "parmesan", "parmesao", "feta", "ricotta",
  ],
  meat_fish: [
    "chicken", "frango", "beef", "vaca", "meat", "carne", "pork", "porco", "turkey", "peru",
    "ham", "fiambre", "presunto", "bacon", "sausage", "salsicha", "chourico", "linguica",
    "steak", "bife", "mince", "carne picada", "fish", "peixe", "salmon", "salmao",
    "tuna", "atum", "cod", "bacalhau", "shrimp", "camarao", "prawn", "sardine", "sardinha",
    "lamb", "borrego", "ribs", "costeleta",
  ],
  bakery: [
    "bread", "pao", "baguette", "roll", "papo seco", "carcaca", "croissant", "cake", "bolo",
    "toast", "torrada", "bun", "muffin", "donut", "pastry", "pastel", "tortilla", "wrap",
  ],
  frozen: [
    "frozen", "congelado", "ice cream", "gelado", "fish fingers", "douradinhos",
    "frozen pizza", "pizza congelada",
  ],
  pantry: [
    "rice", "arroz", "pasta", "massa", "spaghetti", "esparguete", "flour", "farinha",
    "sugar", "acucar", "salt", "sal", "oil", "oleo", "olive oil", "azeite", "vinegar", "vinagre",
    "tomato sauce", "molho de tomate", "ketchup", "mustard", "mostarda", "mayonnaise", "maionese",
    "beans", "feijao", "chickpeas", "grao", "lentils", "lentilhas", "cereal", "cereais",
    "oats", "aveia", "coffee", "cafe", "tea", "cha", "honey", "mel", "jam", "compota",
    "chocolate", "biscuits", "bolacha", "cookies", "crackers", "chips", "crisps", "batata frita",
    "nuts", "frutos secos", "peanut", "amendoim", "almond", "amendoa", "cinnamon", "canela",
    "stock", "caldo", "noodles", "couscous", "quinoa", "soup", "sopa", "sauce", "molho",
  ],
  drinks: [
    "water", "agua", "juice", "sumo", "soda", "refrigerante", "coke", "coca cola", "pepsi",
    "beer", "cerveja", "wine", "vinho", "tonic", "tonica", "energy drink", "smoothie",
    "lemonade", "limonada", "ice tea", "ice tea",
  ],
  household: [
    "detergent", "detergente", "soap", "sabao", "sabonete", "shampoo", "champo",
    "toothpaste", "pasta de dentes", "toilet paper", "papel higienico", "paper towel",
    "rolo de cozinha", "papel de cozinha", "napkin", "guardanapo", "trash bags", "sacos do lixo",
    "dish soap", "lava loica", "sponge", "esfregao", "bleach", "lixivia", "softener", "amaciador",
    "cleaner", "limpa", "foil", "papel aluminio", "cling film", "pelicula", "batteries", "pilhas",
    "light bulb", "lampada", "diaper", "fralda", "deodorant", "desodorizante", "razor", "lamina",
    "cotton", "algodao",
  ],
};

const single = new Map<string, string>();
const multi: { kw: string; cat: string }[] = [];

for (const [cat, words] of Object.entries(RAW)) {
  for (const w of words) {
    const n = normalizeName(w);
    if (!n) continue;
    if (n.includes(" ")) {
      multi.push({ kw: n, cat });
    } else if (!single.has(n)) {
      single.set(n, cat);
    }
  }
}
// Longest multiword keywords first, so "olive oil" wins over "oil".
multi.sort((a, b) => b.kw.length - a.kw.length);

export const DICT_SINGLE: ReadonlyMap<string, string> = single;
export const DICT_MULTI: ReadonlyArray<{ kw: string; cat: string }> = multi;
