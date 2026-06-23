import { Component, OnInit, OnDestroy, ViewChild, inject, ChangeDetectorRef } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Subject, Subscription } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonFooter, IonItem, IonInput, IonButton, IonIcon,
  IonChip, IonLabel, IonSpinner,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import { send, helpCircle, chatbubbles, search, closeCircle } from "ionicons/icons";
import { HelpBotService, type HelpBotMessage, type FaqMatch } from "../../core/services/help-bot.service";
import { FaqService } from "../../core/services/faq.service";
import { ErrorHandlerService } from "../../core/services/error-handler.service";
import { EmptyStateComponent } from "../../shared/components/empty-state/empty-state.component";
import { ErrorStateComponent } from "../../shared/components/error-state/error-state.component";
import { SkeletonListComponent } from "../../shared/components/skeleton-list/skeleton-list.component";

interface SuggestionChip {
  label: string;
  query: string;
}

@Component({
  selector: "app-tab-help",
  imports: [
    FormsModule,
    IonContent, IonHeader, IonTitle, IonToolbar,
    IonFooter, IonItem, IonInput, IonButton, IonIcon,
    IonChip, IonLabel, IonSpinner,
    EmptyStateComponent, ErrorStateComponent, SkeletonListComponent,
  ],
  templateUrl: "./tab-help.page.html",
  styleUrls: ["./tab-help.page.scss"],
})
export class TabHelpPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content?: IonContent;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly helpBot = inject(HelpBotService);
  private readonly faqService = inject(FaqService);
  private readonly errorHandler = inject(ErrorHandlerService);

  messages: HelpBotMessage[] = [];
  inputValue = "";
  loading = false;
  categoriesLoading = true;
  categoriesError = false;
  quickReplies: SuggestionChip[] = [
    { label: "Cuenta", query: "cuenta" },
    { label: "Académico", query: "academico" },
    { label: "Bienestar", query: "bienestar" },
    { label: "Técnico", query: "tecnico" },
    { label: "Trámites", query: "tramites" },
  ];
  private readonly inputSubject = new Subject<string>();
  private readonly subscriptions: Subscription[] = [];

  async ngOnInit(): Promise<void> {
    addIcons({ send, helpCircle, chatbubbles, search, 'close-circle': closeCircle });
    this.setupWelcomeMessage();
    this.setupInputDebounce();
    await this.loadQuickReplies();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }

  private setupWelcomeMessage(): void {
    this.addBotMessage(
      "¡Hola! Soy el asistente de UniHub. ¿En qué puedo ayudarte?",
      [],
      this.quickReplies.map((q) => q.label),
    );
  }

  async loadQuickReplies(): Promise<void> {
    this.categoriesLoading = true;
    this.categoriesError = false;
    try {
      const categories = await this.faqService.getActiveCategories();
      if (categories.length > 0) {
        this.quickReplies = categories.map((category) => ({
          label: this.capitalizeCategory(category),
          query: category,
        }));
      }
    } catch (err) {
      this.categoriesError = true;
      this.errorHandler.handleHttpError(err, () => this.loadQuickReplies());
    } finally {
      this.categoriesLoading = false;
    }
  }

  private capitalizeCategory(category: string): string {
    return category
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private setupInputDebounce(): void {
    this.subscriptions.push(
      this.inputSubject
        .pipe(debounceTime(500), distinctUntilChanged())
        .subscribe((value) => {
          if (value.trim().length >= 3) {
            this.helpBot.requestSearch(value.trim());
          }
        }),
    );

    // Optional: subscribe to live results if we want inline suggestions later
    this.subscriptions.push(
      this.helpBot.liveResults$.subscribe(() => {
        // Currently unused; kept for future autocomplete panel
      }),
    );
  }

  onInputChange(value: string | null | undefined): void {
    this.inputSubject.next(value ?? "");
  }

  async sendMessage(): Promise<void> {
    const text = this.inputValue.trim();
    if (!text || this.loading) return;

    this.addUserMessage(text);
    this.inputValue = "";
    this.loading = true;
    this.scrollToBottom();

    const typingId = this.addTypingIndicator();

    try {
      const response = await this.helpBot.search(text);
      this.removeMessage(typingId);

      if (response.is_resolved && response.results.length > 0) {
        const top = response.results[0];
        this.addBotMessage(top.answer, response.results, response.suggestions);
      } else if (response.suggestions && response.suggestions.length > 0) {
        const suggestionText = `No encontré una respuesta exacta. ¿Quizás quisiste decir: ${response.suggestions.map((s) => `"${s}"`).join(", ")}?`;
        this.addBotMessage(suggestionText, [], response.suggestions);
      } else {
        this.addBotMessage(
          "No encontré una respuesta para eso. Prueba con una de estas categorías o escribe otras palabras clave.",
          [],
          this.quickReplies.map((q) => q.label),
        );
      }
    } catch {
      this.removeMessage(typingId);
      this.addBotMessage(
        "Lo siento, ocurrió un error al buscar la respuesta. Intenta de nuevo en un momento.",
        [],
        this.quickReplies.map((q) => q.label),
      );
    } finally {
      this.loading = false;
      this.scrollToBottom();
      this.cdr.detectChanges();
    }
  }

  onQuickReply(chip: SuggestionChip): void {
    this.inputValue = chip.label;
    this.sendMessage();
  }

  onSuggestionClick(suggestion: string): void {
    this.inputValue = suggestion;
    this.sendMessage();
  }

  trackMessage(_index: number, message: HelpBotMessage): string {
    return message.id;
  }

  private addUserMessage(text: string): void {
    this.messages.push({
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date().toISOString(),
    });
  }

  private addBotMessage(
    text: string,
    results: FaqMatch[] = [],
    suggestions: string[] = [],
  ): void {
    this.messages.push({
      id: crypto.randomUUID(),
      role: "bot",
      text,
      timestamp: new Date().toISOString(),
      results,
      suggestions,
    });
  }

  private addTypingIndicator(): string {
    const id = crypto.randomUUID();
    this.messages.push({
      id,
      role: "bot",
      text: "",
      timestamp: new Date().toISOString(),
      isTyping: true,
    });
    return id;
  }

  private removeMessage(id: string): void {
    this.messages = this.messages.filter((m) => m.id !== id);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.content?.scrollToBottom(300);
    }, 50);
  }
}
