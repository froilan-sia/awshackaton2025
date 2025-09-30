import { PronunciationGuide, SupportedLanguage } from '../types/translation';
import { PronunciationGuideModel } from '../models/PronunciationGuide';

export class PronunciationService {
  private guides: Map<string, PronunciationGuideModel[]> = new Map();

  constructor() {
    this.initializeCantonesePhrases();
  }

  private initializeCantonesePhrases(): void {
    const cantonesePhrases: any[] = [
      // Basic Greetings
      {
        text: '你好',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'nei5 hou2',
        difficulty: 'easy',
        category: 'greetings',
        usage: 'Hello - basic greeting used throughout the day'
      },
      {
        text: '早晨',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'zou2 san4',
        difficulty: 'easy',
        category: 'greetings',
        usage: 'Good morning - used until around 11 AM'
      },
      {
        text: '唔該',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'm4 goi1',
        difficulty: 'medium',
        usage: 'Thank you/Excuse me - very versatile phrase used for thanks or to get attention'
      },
      {
        text: '多謝',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'do1 ze6',
        difficulty: 'easy',
        category: 'politeness',
        usage: 'Thank you - more formal than 唔該'
      },
      
      // Dining
      {
        text: '埋單',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'maai4 daan1',
        difficulty: 'medium',
        category: 'dining',
        usage: 'Check please - used to ask for the bill at restaurants'
      },
      {
        text: '飲茶',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'jam2 caa4',
        difficulty: 'easy',
        category: 'dining',
        usage: 'Dim sum - literally "drink tea", refers to the dim sum dining experience'
      },
      {
        text: '好味',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'hou2 mei6',
        difficulty: 'easy',
        category: 'dining',
        usage: 'Delicious - compliment for good food'
      },
      
      // Transportation
      {
        text: '地鐵',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'dei6 tit3',
        difficulty: 'medium',
        category: 'transportation',
        usage: 'MTR/Subway - Hong Kong\'s metro system'
      },
      {
        text: '巴士',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'baa1 si2',
        difficulty: 'easy',
        category: 'transportation',
        usage: 'Bus - public bus transportation'
      },
      {
        text: '的士',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'dik1 si2',
        difficulty: 'easy',
        category: 'transportation',
        usage: 'Taxi - from English "taxi"'
      },
      
      // Shopping
      {
        text: '幾多錢',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'gei2 do1 cin2',
        difficulty: 'medium',
        category: 'shopping',
        usage: 'How much? - asking for price'
      },
      {
        text: '平啲',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'peng4 di1',
        difficulty: 'hard',
        category: 'shopping',
        usage: 'Cheaper - asking for a discount'
      },
      
      // Directions
      {
        text: '喺邊度',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'hai2 bin1 dou6',
        difficulty: 'hard',
        category: 'directions',
        usage: 'Where is...? - asking for location'
      },
      {
        text: '直行',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'zik6 hang4',
        difficulty: 'medium',
        category: 'directions',
        usage: 'Go straight - navigation instruction'
      },
      
      // Emergency/Help
      {
        text: '救命',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'gau3 meng6',
        difficulty: 'easy',
        category: 'emergency',
        usage: 'Help! - emergency call for help'
      },
      {
        text: '唔識講廣東話',
        language: SupportedLanguage.CANTONESE,
        phonetic: 'm4 sik1 gong2 gwong2 dung1 waa2',
        difficulty: 'hard',
        category: 'communication',
        usage: 'I don\'t speak Cantonese - useful phrase for tourists'
      }
    ];

    const models = cantonesePhrases.map(phrase => new PronunciationGuideModel(phrase));
    this.guides.set(SupportedLanguage.CANTONESE, models);
  }

  public async getPronunciationGuides(language: string, category?: string): Promise<PronunciationGuide[]> {
    const languageGuides = this.guides.get(language) || [];
    
    if (category) {
      return languageGuides
        .filter(guide => guide.category === category)
        .map(guide => guide.toJSON());
    }
    
    return languageGuides.map(guide => guide.toJSON());
  }

  public async getPronunciationByText(text: string, language: string): Promise<PronunciationGuide | null> {
    const languageGuides = this.guides.get(language) || [];
    const guide = languageGuides.find(g => g.text === text);
    return guide ? guide.toJSON() : null;
  }

  public async addPronunciationGuide(guide: Partial<PronunciationGuide>): Promise<PronunciationGuide> {
    const model = new PronunciationGuideModel(guide);
    const validation = model.validate();

    if (!validation.isValid) {
      throw new Error(`Invalid pronunciation guide: ${validation.errors.join(', ')}`);
    }

    const language = model.language;
    const existingGuides = this.guides.get(language) || [];
    existingGuides.push(model);
    this.guides.set(language, existingGuides);

    return model.toJSON();
  }

  public async getGuidesByDifficulty(language: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<PronunciationGuide[]> {
    const languageGuides = this.guides.get(language) || [];
    return languageGuides
      .filter(guide => guide.difficulty === difficulty)
      .map(guide => guide.toJSON());
  }

  public async getGuidesByCategory(language: string, category: string): Promise<PronunciationGuide[]> {
    const languageGuides = this.guides.get(language) || [];
    return languageGuides
      .filter(guide => guide.category === category)
      .map(guide => guide.toJSON());
  }

  public async searchGuides(language: string, searchTerm: string): Promise<PronunciationGuide[]> {
    const languageGuides = this.guides.get(language) || [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return languageGuides
      .filter(guide => 
        guide.text.includes(searchTerm) ||
        guide.phonetic.toLowerCase().includes(lowerSearchTerm) ||
        guide.usage.toLowerCase().includes(lowerSearchTerm) ||
        guide.category.toLowerCase().includes(lowerSearchTerm)
      )
      .map(guide => guide.toJSON());
  }

  public getAvailableCategories(language: string): string[] {
    const languageGuides = this.guides.get(language) || [];
    const categories = new Set(languageGuides.map(guide => guide.category));
    return Array.from(categories);
  }

  public getSupportedLanguages(): string[] {
    return Array.from(this.guides.keys());
  }
}