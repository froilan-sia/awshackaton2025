import { CulturalEtiquetteContent, EtiquetteCategory, SupportedLanguage } from '../types/translation';
import { CulturalEtiquetteModel } from '../models/CulturalEtiquette';

export class CulturalEtiquetteService {
  private etiquetteContent: Map<string, CulturalEtiquetteModel[]> = new Map();

  constructor() {
    this.initializeEtiquetteContent();
  }

  private initializeEtiquetteContent(): void {
    const etiquetteData: any[] = [
      // Dining Etiquette
      {
        category: EtiquetteCategory.DINING,
        title: 'Dim Sum Etiquette',
        content: 'When dining dim sum, tea is served first. Pour tea for others before yourself, and tap two fingers on the table to say thank you when someone pours for you. Don\'t point chopsticks at people, and place them parallel on your bowl when finished.',
        language: SupportedLanguage.ENGLISH,
        context: ['restaurant', 'dim_sum', 'tea_house'],
        importance: 'high',
        tags: ['chopsticks', 'tea', 'respect']
      },
      {
        category: EtiquetteCategory.DINING,
        title: 'Paying the Bill',
        content: 'In Hong Kong, it\'s common for the host or eldest person to pay the entire bill. If you want to contribute, offer politely but don\'t insist if declined. Tipping is not mandatory but 10% is appreciated in restaurants.',
        language: SupportedLanguage.ENGLISH,
        context: ['restaurant', 'payment'],
        importance: 'medium',
        tags: ['payment', 'tipping', 'respect']
      },
      
      // Transportation Etiquette
      {
        category: EtiquetteCategory.TRANSPORTATION,
        title: 'MTR Etiquette',
        content: 'Stand on the right side of escalators, let passengers exit before boarding, offer priority seats to elderly/pregnant/disabled passengers. No eating or drinking (except water). Keep conversations quiet and remove backpacks in crowded cars.',
        language: SupportedLanguage.ENGLISH,
        context: ['mtr', 'subway', 'public_transport'],
        importance: 'critical',
        tags: ['escalator', 'priority_seats', 'noise']
      },
      {
        category: EtiquetteCategory.TRANSPORTATION,
        title: 'Taxi Etiquette',
        content: 'Sit in the back seat unless invited to sit in front. Have your destination written in Chinese characters if possible. Round up the fare as a small tip. Red taxis serve Hong Kong Island and Kowloon, green taxis serve New Territories.',
        language: SupportedLanguage.ENGLISH,
        context: ['taxi', 'transportation'],
        importance: 'medium',
        tags: ['seating', 'destination', 'tipping']
      },
      
      // Religious Sites
      {
        category: EtiquetteCategory.RELIGIOUS_SITES,
        title: 'Temple Etiquette',
        content: 'Dress modestly (cover shoulders and knees). Remove hats and sunglasses. Bow slightly before entering main halls. Don\'t point feet toward Buddha statues. Photography may be restricted - ask first. Speak quietly and turn off phone ringers.',
        language: SupportedLanguage.ENGLISH,
        context: ['temple', 'buddhist', 'taoist'],
        importance: 'critical',
        tags: ['dress_code', 'respect', 'photography']
      },
      
      // Shopping Etiquette
      {
        category: EtiquetteCategory.SHOPPING,
        title: 'Market Shopping',
        content: 'Bargaining is expected at street markets and some shops, but not in malls or chain stores. Start at 50-70% of asking price. Be polite and smile. Don\'t touch produce unless you plan to buy. Bring cash as many small vendors don\'t accept cards.',
        language: SupportedLanguage.ENGLISH,
        context: ['market', 'street_shopping', 'bargaining'],
        importance: 'medium',
        tags: ['bargaining', 'cash', 'respect']
      },
      
      // Social Interaction
      {
        category: EtiquetteCategory.SOCIAL_INTERACTION,
        title: 'Greeting and Business Cards',
        content: 'A slight bow or nod is appropriate when meeting someone. Receive business cards with both hands and take a moment to read it before putting it away respectfully. Don\'t write on someone\'s business card in their presence.',
        language: SupportedLanguage.ENGLISH,
        context: ['meeting', 'business', 'greeting'],
        importance: 'high',
        tags: ['business_cards', 'respect', 'greeting']
      },
      {
        category: EtiquetteCategory.SOCIAL_INTERACTION,
        title: 'Gift Giving',
        content: 'Avoid giving clocks, white flowers, or items in sets of four (unlucky number). Wrap gifts in red or gold paper, not white. Present and receive gifts with both hands. The recipient may not open gifts immediately - this is normal.',
        language: SupportedLanguage.ENGLISH,
        context: ['gifts', 'cultural_exchange'],
        importance: 'medium',
        tags: ['gifts', 'colors', 'numbers']
      },
      
      // Cultural Events
      {
        category: EtiquetteCategory.CULTURAL_EVENTS,
        title: 'Festival Participation',
        content: 'During Chinese festivals, red is considered lucky. Avoid wearing all black or white to celebrations. If invited to someone\'s home, bring fruit or pastries. Remove shoes when entering homes. Accept offered food and drink graciously.',
        language: SupportedLanguage.ENGLISH,
        context: ['festival', 'celebration', 'home_visit'],
        importance: 'high',
        tags: ['colors', 'gifts', 'respect']
      }
    ];

    // Create models and organize by language
    const models = etiquetteData.map(data => new CulturalEtiquetteModel(data));
    this.etiquetteContent.set(SupportedLanguage.ENGLISH, models);
  }

  public async getEtiquetteByCategory(category: EtiquetteCategory, language: string = SupportedLanguage.ENGLISH): Promise<CulturalEtiquetteContent[]> {
    const languageContent = this.etiquetteContent.get(language) || [];
    return languageContent
      .filter(content => content.category === category)
      .map(content => content.toJSON());
  }

  public async getEtiquetteByContext(context: string, language: string = SupportedLanguage.ENGLISH): Promise<CulturalEtiquetteContent[]> {
    const languageContent = this.etiquetteContent.get(language) || [];
    return languageContent
      .filter(content => content.context.includes(context))
      .map(content => content.toJSON());
  }

  public async getEtiquetteByImportance(importance: 'low' | 'medium' | 'high' | 'critical', language: string = SupportedLanguage.ENGLISH): Promise<CulturalEtiquetteContent[]> {
    const languageContent = this.etiquetteContent.get(language) || [];
    return languageContent
      .filter(content => content.importance === importance)
      .map(content => content.toJSON());
  }

  public async getAllEtiquette(language: string = SupportedLanguage.ENGLISH): Promise<CulturalEtiquetteContent[]> {
    const languageContent = this.etiquetteContent.get(language) || [];
    return languageContent.map(content => content.toJSON());
  }

  public async searchEtiquette(searchTerm: string, language: string = SupportedLanguage.ENGLISH): Promise<CulturalEtiquetteContent[]> {
    const languageContent = this.etiquetteContent.get(language) || [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return languageContent
      .filter(content => 
        content.title.toLowerCase().includes(lowerSearchTerm) ||
        content.content.toLowerCase().includes(lowerSearchTerm) ||
        content.context.some(ctx => ctx.toLowerCase().includes(lowerSearchTerm)) ||
        content.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
      )
      .map(content => content.toJSON());
  }

  public async addEtiquetteContent(content: Partial<CulturalEtiquetteContent>): Promise<CulturalEtiquetteContent> {
    const model = new CulturalEtiquetteModel(content);
    const validation = model.validate();

    if (!validation.isValid) {
      throw new Error(`Invalid etiquette content: ${validation.errors.join(', ')}`);
    }

    const language = model.language;
    const existingContent = this.etiquetteContent.get(language) || [];
    existingContent.push(model);
    this.etiquetteContent.set(language, existingContent);

    return model.toJSON();
  }

  public async translateEtiquetteContent(contentId: string, targetLanguage: string, translatedTitle: string, translatedContent: string): Promise<CulturalEtiquetteContent> {
    // Find the original content
    let originalContent: CulturalEtiquetteModel | null = null;
    
    for (const [, contents] of this.etiquetteContent) {
      const found = contents.find(content => content.id === contentId);
      if (found) {
        originalContent = found;
        break;
      }
    }

    if (!originalContent) {
      throw new Error('Original content not found');
    }

    // Create translated version
    const translatedModel = new CulturalEtiquetteModel({
      category: originalContent.category,
      title: translatedTitle,
      content: translatedContent,
      language: targetLanguage,
      context: originalContent.context,
      importance: originalContent.importance,
      tags: originalContent.tags
    });

    const targetLanguageContent = this.etiquetteContent.get(targetLanguage) || [];
    targetLanguageContent.push(translatedModel);
    this.etiquetteContent.set(targetLanguage, targetLanguageContent);

    return translatedModel.toJSON();
  }

  public getAvailableCategories(): EtiquetteCategory[] {
    return Object.values(EtiquetteCategory);
  }

  public getAvailableContexts(language: string = SupportedLanguage.ENGLISH): string[] {
    const languageContent = this.etiquetteContent.get(language) || [];
    const contexts = new Set<string>();
    
    languageContent.forEach(content => {
      content.context.forEach(ctx => contexts.add(ctx));
    });
    
    return Array.from(contexts);
  }

  public getSupportedLanguages(): string[] {
    return Array.from(this.etiquetteContent.keys());
  }
}