<#import "footer.ftl" as loginFooter>
<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if>>
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${title!msg("loginTitle", (realm.displayName!msg("platformName")))}</title>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" defer></script>
        </#list>
    </#if>
</head>
<body class="${properties.kcBodyClass!} ${bodyClass}" data-page-id="${pageId!'login'}">
    <div class="${properties.kcLoginClass!}">
        <header class="mobile-brand-header" aria-label="${msg('platformName')}">
            <img src="${url.resourcesPath}/img/logo_bufnita.jpeg" alt="${msg('platformName')}" class="mobile-brand-header__logo" />
            <div class="mobile-brand-header__copy">
                <span class="mobile-brand-header__name">${msg("platformName")}</span>
                <span class="mobile-brand-header__caption">${msg("brandCaption")}</span>
            </div>
        </header>

        <aside class="auth-brand-panel">
            <div class="auth-brand-panel__content">
                <div class="brand-header" aria-label="${msg('platformName')}">
                    <img src="${url.resourcesPath}/img/logo_bufnita.jpeg" alt="${msg('platformName')}" class="brand-logo" />
                    <div class="brand-header__copy">
                        <span class="brand-name">${msg("platformName")}</span>
                        <span class="brand-caption">${msg("brandCaption")}</span>
                    </div>
                </div>

                <div class="brand-copy brand-copy--single">
                    <span class="brand-badge">${msg("brandBadge")}</span>
                    <h1 class="brand-title">${msg("brandTitle")}</h1>
                    <p class="brand-description">${msg("brandDescription")}</p>

                    <div class="brand-benefits" aria-label="${msg('brandBenefitsLabel')}">
                        <div class="brand-benefit-card">
                            <span class="brand-benefit-card__icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none"><path d="M4.75 6.75A2.75 2.75 0 0 1 7.5 4h8.25a3.5 3.5 0 0 1 3.5 3.5v9.75a.75.75 0 0 1-1.16.63 4.9 4.9 0 0 0-2.59-.73H7.5a2.75 2.75 0 0 0-2.75 2.75.75.75 0 0 1-1.5 0V6.75Zm2.75-1.25a1.25 1.25 0 0 0-1.25 1.25v9.67A4.22 4.22 0 0 1 7.5 15.9H17.75V7.5a2 2 0 0 0-2-2H7.5Z" fill="currentColor"/><path d="M8.5 8.25a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Z" fill="currentColor"/></svg>
                            </span>
                            <span class="brand-benefit-card__copy">
                                <span>${msg("benefitCourses")}</span>
                                <span class="brand-benefit-card__emoji" aria-hidden="true">📚</span>
                            </span>
                        </div>
                        <div class="brand-benefit-card">
                            <span class="brand-benefit-card__icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none"><path d="M12 4.75a.75.75 0 0 1 .75.75v5.19l3.72 2.16a.75.75 0 1 1-.75 1.3l-4.1-2.38a.75.75 0 0 1-.37-.65V5.5a.75.75 0 0 1 .75-.75Z" fill="currentColor"/><path d="M12 2.75a9.25 9.25 0 1 0 9.25 9.25A9.26 9.26 0 0 0 12 2.75Zm0 17a7.75 7.75 0 1 1 7.75-7.75A7.76 7.76 0 0 1 12 19.75Z" fill="currentColor"/></svg>
                            </span>
                            <span class="brand-benefit-card__copy">
                                <span>${msg("benefitProgress")}</span>
                                <span class="brand-benefit-card__emoji" aria-hidden="true">📈</span>
                            </span>
                        </div>
                        <div class="brand-benefit-card">
                            <span class="brand-benefit-card__icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none"><path d="M7.5 7.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Zm0-1.5a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5Zm9 1.5a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Zm0-1.5a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5Zm-12.21 10h6.42c1.67 0 3.04 1.25 3.22 2.87a.75.75 0 1 1-1.49.16 1.76 1.76 0 0 0-1.73-1.53H4.29a1.76 1.76 0 0 0-1.73 1.53.75.75 0 1 1-1.49-.16 3.25 3.25 0 0 1 3.22-2.87Zm8.99 0h6.42c1.67 0 3.04 1.25 3.22 2.87a.75.75 0 1 1-1.49.16 1.76 1.76 0 0 0-1.73-1.53h-6.42a1.76 1.76 0 0 0-1.73 1.53.75.75 0 1 1-1.49-.16 3.25 3.25 0 0 1 3.22-2.87Z" fill="currentColor"/></svg>
                            </span>
                            <span class="brand-benefit-card__copy">
                                <span>${msg("benefitAccess")}</span>
                                <span class="brand-benefit-card__emoji" aria-hidden="true">🤝</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <main class="auth-form-panel">
            <div class="auth-form-stack">
                <div class="auth-rag-promo" aria-label="Aky RAG">
                    <p class="auth-rag-promo__label">Acum mai ușor de învățat cu</p>
                    <img src="${url.resourcesPath}/img/logo_RAG-removebg-preview.png" alt="Aky RAG" class="auth-rag-promo__logo" />
                </div>

                <#nested "preFormCard">

                <div class="${properties.kcFormCardClass!}">
                <header class="${properties.kcFormHeaderClass!}">
                    <div class="header-row">
                        <div>
                            <p class="eyebrow">${msg(authEyebrowKey!'authEyebrow')}</p>
                            <h2 id="kc-page-title" class="auth-title"><#nested "header"></h2>
                            <p class="auth-subtitle">${msg(authSubtitleKey!'authSubtitle')}</p>
                        </div>

                        <#if realm.internationalizationEnabled && locale.supported?size gt 1>
                            <div class="${properties.kcLocaleMainClass!}" id="kc-locale">
                                <div class="${properties.kcLocaleWrapperClass!}">
                                    <details class="${properties.kcLocaleDropDownClass!}">
                                        <summary>${locale.current}</summary>
                                        <ul class="${properties.kcLocaleListClass!}">
                                            <#list locale.supported as l>
                                                <li class="${properties.kcLocaleListItemClass!}">
                                                    <a class="${properties.kcLocaleItemClass!}" href="${l.url}">${l.label}</a>
                                                </li>
                                            </#list>
                                        </ul>
                                    </details>
                                </div>
                            </div>
                        </#if>
                    </div>

                    <#if auth?has_content && auth.showUsername() && !auth.showResetCredentials()>
                        <div class="attempted-user">
                            <span class="attempted-user__label">${msg("signedInAs")}</span>
                            <div class="attempted-user__row">
                                <span id="kc-attempted-username">${auth.attemptedUsername}</span>
                                <a id="reset-login" href="${url.loginRestartFlowUrl}">${msg("restartLoginTooltip")}</a>
                            </div>
                        </div>
                    </#if>

                    <#if displayRequiredFields>
                        <p class="required-note"><span>*</span> ${msg("requiredFields")}</p>
                    </#if>
                </header>

                <div class="auth-card-body">
                    <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
                        <div class="${properties.kcAlertClass!} alert-${message.type}">
                            <span class="alert-indicator" aria-hidden="true"></span>
                            <span class="${properties.kcAlertTitleClass!}">${kcSanitize(message.summary)?no_esc}</span>
                        </div>
                    </#if>

                    <#nested "form">

                    <#if auth?has_content && auth.showTryAnotherWayLink()>
                        <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post">
                            <div class="auth-inline-link-row">
                                <input type="hidden" name="tryAnotherWay" value="on"/>
                                <a href="#" id="try-another-way" onclick="document.forms['kc-select-try-another-way-form'].requestSubmit();return false;">${msg("doTryAnotherWay")}</a>
                            </div>
                        </form>
                    </#if>

                    <#if switchOrganizationEnabled?? && switchOrganizationEnabled>
                        <form id="kc-switch-organization-form" action="${url.loginAction}" method="post">
                            <div class="auth-inline-link-row">
                                <input type="hidden" name="switchOrganization" value="true"/>
                                <a href="#" id="switch-organization" onclick="document.forms['kc-switch-organization-form'].requestSubmit();return false;">${msg("doSwitchOrganization")}</a>
                            </div>
                        </form>
                    </#if>

                    <#nested "socialProviders">

                    <#if displayInfo>
                        <div id="kc-info" class="${properties.kcSignUpClass!}">
                            <div id="kc-info-wrapper" class="${properties.kcInfoAreaWrapperClass!}">
                                <#nested "info">
                            </div>
                        </div>
                    </#if>
                </div>

                    <@loginFooter.content />
                </div>
            </div>
        </main>
    </div>
</body>
</html>
</#macro>
