import { CulturalEtiquetteModel } from '../models/CulturalEtiquette';
import { CulturalEtiquetteGuide, VenueType } from '../types/practicalTips';

export class CulturalEtiquetteService {
  private etiquetteGuides: Map<string, CulturalEtiquetteModel> = new Map();

  constructor() {
    this.initializeCulturalEtiquetteGuides();
  }

  private initializeCulturalEtiquetteGuides(): void {
    const defaultGuides = this.getDefaultEtiquetteGuides();
    defaultGuides.forEach(guide => {
      const model = new CulturalEtiquetteModel(guide);
      this.etiquetteGuides.set(model.id, model);
    });
  }

  public async getEtiquetteForVenue(
    venueType: VenueType,
    language: string = 'en'
  ): Promise<CulturalEtiquetteGuide[]> {
    const applicableGuides = Array.from(this.etiquetteGuides.values())
      .filter(guide => guide.isApplicableForVenue(venueType) && guide.language === language)
      .map(guide => guide.toJSON());

    return applicableGuides;
  }

  public async createEtiquetteGuide(
    data: Partial<CulturalEtiquetteGuide>
  ): Promise<CulturalEtiquetteGuide> {
    const guide = new CulturalEtiquetteModel(data);
    this.etiquetteGuides.set(guide.id, guide);
    return guide.toJSON();
  }

  public async updateEtiquetteGuide(
    id: string,
    updates: Partial<CulturalEtiquetteGuide>
  ): Promise<CulturalEtiquetteGuide | null> {
    const guide = this.etiquetteGuides.get(id);
    if (!guide) return null;

    Object.assign(guide, updates);
    return guide.toJSON();
  }

  public async deleteEtiquetteGuide(id: string): Promise<boolean> {
    return this.etiquetteGuides.delete(id);
  }

  public async getAllEtiquetteGuides(language: string = 'en'): Promise<CulturalEtiquetteGuide[]> {
    return Array.from(this.etiquetteGuides.values())
      .filter(guide => guide.language === language)
      .map(guide => guide.toJSON());
  }

  public async getEtiquetteById(id: string): Promise<CulturalEtiquetteGuide | null> {
    const guide = this.etiquetteGuides.get(id);
    return guide ? guide.toJSON() : null;
  }

  public async getGeneralEtiquetteGuidelines(language: string = 'en'): Promise<{
    general: string[];
    transportation: string[];
    dining: string[];
    shopping: string[];
    religious: string[];
  }> {
    const guidelines = {
      general: [
        'Bow slightly when greeting, especially to elders',
        'Use both hands when giving or receiving business cards',
        'Remove shoes when entering homes',
        'Avoid pointing with your finger; use an open hand instead',
        'Keep your voice down in public spaces'
      ],
      transportation: [
        'Stand on the right side of escalators',
        'Give up priority seats to elderly, pregnant women, and disabled',
        'No eating or drinking on MTR trains',
        'Wait for passengers to exit before boarding',
        'Keep backpack in front in crowded areas'
      ],
      dining: [
        'Wait to be seated at restaurants',
        'Use chopsticks properly - never stick them upright in rice',
        'Try a bit of everything when sharing dishes',
        'It\'s polite to leave a small amount of food on your plate',
        'Tea pouring etiquette: serve others before yourself'
      ],
      shopping: [
        'Bargaining is acceptable at street markets, not in malls',
        'Bring cash for street vendors and local markets',
        'Don\'t touch merchandise unless you\'re seriously considering buying',
        'Be patient during busy shopping periods',
        'Plastic bags may cost extra - bring reusable bags'
      ],
      religious: [
        'Dress modestly when visiting temples',
        'Remove hats and sunglasses inside religious buildings',
        'Speak quietly and move slowly in sacred spaces',
        'Don\'t point at religious statues or artifacts',
        'Follow photography restrictions'
      ]
    };

    return guidelines;
  }

  private getDefaultEtiquetteGuides(): Partial<CulturalEtiquetteGuide>[] {
    return [
      {
        venueType: VenueType.TEMPLE,
        title: 'Temple and Religious Site Etiquette',
        description: 'Hong Kong temples are active places of worship. Show respect for local customs and religious practices.',
        dosList: [
          'Dress modestly - cover shoulders and knees',
          'Remove hats, sunglasses, and shoes if required',
          'Bow slightly before entering main halls',
          'Speak in whispers or remain silent',
          'Follow the flow of other worshippers',
          'Make small donations if you wish',
          'Observe quietly without interfering'
        ],
        dontsList: [
          'Don\'t point at statues or religious artifacts',
          'Don\'t turn your back to main altars',
          'Don\'t take photos if prohibited',
          'Don\'t touch religious objects without permission',
          'Don\'t wear revealing clothing',
          'Don\'t bring food or drinks inside',
          'Don\'t make loud noises or laugh loudly'
        ],
        dresscode: 'Conservative clothing covering shoulders and knees. Remove shoes if required.',
        behaviorGuidelines: [
          'Move slowly and deliberately',
          'Keep hands clasped or at sides',
          'Bow respectfully to monks or temple staff',
          'Wait your turn at popular shrines',
          'Follow incense burning protocols if participating'
        ],
        commonMistakes: [
          'Wearing shorts or tank tops',
          'Taking selfies in front of altars',
          'Speaking loudly on phone calls',
          'Rushing through without showing respect',
          'Ignoring "no photography" signs'
        ],
        localCustoms: [
          'Many locals visit temples for prayer and fortune telling',
          'Incense burning is common - follow local lead',
          'Some temples have specific rituals for different purposes',
          'Donations are appreciated but not required',
          'Temple festivals have special customs and crowds'
        ],
        language: 'en'
      },
      {
        venueType: VenueType.RESTAURANT,
        title: 'Dining Etiquette in Hong Kong',
        description: 'Hong Kong has a rich food culture with specific dining customs, especially for dim sum and family-style meals.',
        dosList: [
          'Wait to be seated, even at casual restaurants',
          'Use chopsticks properly and respectfully',
          'Try a bit of everything when sharing dishes',
          'Pour tea for others before yourself',
          'Use the serving spoon for shared dishes',
          'Compliment the food to show appreciation',
          'Split the bill evenly or let elders pay'
        ],
        dontsList: [
          'Don\'t stick chopsticks upright in rice (resembles incense at funerals)',
          'Don\'t point with chopsticks',
          'Don\'t flip fish on your plate (bad luck for fishermen)',
          'Don\'t finish everything on your plate (implies you weren\'t fed enough)',
          'Don\'t start eating before elders',
          'Don\'t waste food',
          'Don\'t be overly loud or boisterous'
        ],
        behaviorGuidelines: [
          'Wait for the host to start eating',
          'Serve others before serving yourself',
          'Use both hands when receiving dishes',
          'Keep your rice bowl close to your mouth',
          'Place chopsticks parallel on the bowl when finished'
        ],
        commonMistakes: [
          'Using chopsticks like drumsticks',
          'Reaching across the table instead of asking',
          'Not participating in tea pouring ritual',
          'Eating too quickly or too slowly',
          'Not showing appreciation for the meal'
        ],
        localCustoms: [
          'Dim sum is typically eaten with family or friends',
          'Tea is central to the dining experience',
          'Sharing dishes is the norm, not individual plates',
          'Meals are social events, not rushed affairs',
          'Paying the bill can be competitive - elders often insist'
        ],
        language: 'en'
      },
      {
        venueType: VenueType.TRANSPORTATION_HUB,
        title: 'Public Transportation Etiquette',
        description: 'Hong Kong\'s efficient public transport system has specific etiquette rules that help millions of people move smoothly every day.',
        dosList: [
          'Stand on the right side of escalators',
          'Give up priority seats to those who need them',
          'Wait for passengers to exit before boarding',
          'Keep your backpack in front in crowded areas',
          'Have your Octopus card ready',
          'Move to the center of the car',
          'Keep conversations quiet'
        ],
        dontsList: [
          'Don\'t eat or drink on MTR trains',
          'Don\'t block doors or aisles',
          'Don\'t put feet on seats',
          'Don\'t play music without headphones',
          'Don\'t push or shove',
          'Don\'t take up extra seats with bags',
          'Don\'t lean on the doors'
        ],
        behaviorGuidelines: [
          'Queue in an orderly fashion',
          'Help elderly or disabled passengers when appropriate',
          'Keep phone conversations brief and quiet',
          'Be patient during rush hours',
          'Follow staff instructions during delays'
        ],
        commonMistakes: [
          'Standing on the left side of escalators',
          'Not moving to the center of train cars',
          'Eating smelly food on trains',
          'Not giving up priority seats when needed',
          'Blocking doors during rush hour'
        ],
        localCustoms: [
          'Rush hours are extremely crowded but orderly',
          'People often sleep on longer journeys',
          'Octopus cards are used for almost everything',
          'MTR is considered very safe, even late at night',
          'Air conditioning can be very cold - bring a light jacket'
        ],
        language: 'en'
      },
      {
        venueType: VenueType.MARKET,
        title: 'Market Shopping Etiquette',
        description: 'Hong Kong markets, from wet markets to night markets, have their own customs and bargaining culture.',
        dosList: [
          'Bring cash - most vendors don\'t accept cards',
          'Bargain politely at street markets',
          'Look but don\'t touch unless seriously interested',
          'Be patient and friendly with vendors',
          'Try to learn basic Cantonese numbers',
          'Bring your own bags when possible',
          'Respect the vendor\'s space and products'
        ],
        dontsList: [
          'Don\'t bargain at fixed-price stalls',
          'Don\'t handle merchandise roughly',
          'Don\'t expect bargaining in shopping malls',
          'Don\'t be offended by direct sales approaches',
          'Don\'t block narrow aisles',
          'Don\'t take photos without permission',
          'Don\'t expect English at all stalls'
        ],
        behaviorGuidelines: [
          'Start bargaining at about 70% of asking price',
          'Be prepared to walk away if price isn\'t right',
          'Show respect for the vendor\'s livelihood',
          'Keep transactions friendly and light-hearted',
          'Pay promptly once you agree on a price'
        ],
        commonMistakes: [
          'Expecting credit card acceptance everywhere',
          'Being too aggressive with bargaining',
          'Not bringing small bills for easier transactions',
          'Assuming all markets allow bargaining',
          'Not checking quality before buying'
        ],
        localCustoms: [
          'Wet markets are for fresh food, usually no bargaining',
          'Night markets are more tourist-oriented with bargaining',
          'Temple Street is famous for fortune telling and food',
          'Ladies\' Market is known for clothing and accessories',
          'Local markets close early, usually by 6-7 PM'
        ],
        language: 'en'
      },
      {
        venueType: VenueType.MUSEUM,
        title: 'Museum and Cultural Site Etiquette',
        description: 'Hong Kong\'s museums showcase rich history and culture. Follow these guidelines to enhance your experience and respect the exhibits.',
        dosList: [
          'Keep voices low and conversations brief',
          'Follow photography rules strictly',
          'Keep a respectful distance from exhibits',
          'Use audio guides or read information plaques',
          'Follow the suggested route through exhibitions',
          'Turn off flash photography where allowed',
          'Supervise children closely'
        ],
        dontsList: [
          'Don\'t touch exhibits unless specifically allowed',
          'Don\'t use flash photography',
          'Don\'t bring food or drinks into exhibition areas',
          'Don\'t run or make sudden movements',
          'Don\'t block other visitors\' views',
          'Don\'t ignore staff instructions',
          'Don\'t take phone calls in quiet areas'
        ],
        behaviorGuidelines: [
          'Move slowly and deliberately through exhibits',
          'Allow others to view popular displays',
          'Ask staff questions if you need clarification',
          'Respect queue systems for popular exhibits',
          'Keep personal belongings secure and out of the way'
        ],
        commonMistakes: [
          'Assuming all areas allow photography',
          'Not checking bag storage requirements',
          'Rushing through without reading information',
          'Bringing prohibited items like large bags',
          'Not respecting quiet zones'
        ],
        localCustoms: [
          'Many museums offer free admission on certain days',
          'Audio guides are often available in multiple languages',
          'Some museums have special exhibitions requiring separate tickets',
          'School groups are common during weekdays',
          'Air conditioning can be quite cold - bring a light jacket'
        ],
        language: 'en'
      }
    ];
  }
}