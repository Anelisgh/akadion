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
    <#if bodyClass?contains("page-update-password")>
        <title>${msg("updatePasswordTitle", "Actualizare parolă")} - ${(realm.displayName!msg("platformName"))}</title>
    <#elseif bodyClass?contains("page-forgot-password")>
        <title>${msg("emailForgotTitle", "Ai uitat parola?")} - ${(realm.displayName!msg("platformName"))}</title>
    <#elseif bodyClass?contains("page-register")>
        <title>${msg("registerTitle")} - ${(realm.displayName!msg("platformName"))}</title>
    <#elseif bodyClass?contains("page-login")>
        <title>${msg("loginAccountTitle")} - ${(realm.displayName!msg("platformName"))}</title>
    <#else>
        <title>${title!msg("loginTitle", (realm.displayName!msg("platformName")))}</title>
    </#if>
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
            <img src="${url.resourcesPath}/img/logo_bufnita.png" alt="${msg('platformName')}" class="mobile-brand-header__logo" />
            <div class="mobile-brand-header__copy">
                <span class="mobile-brand-header__caption">${msg("brandCaption")}</span>
            </div>
        </header>

        <aside class="auth-brand-panel">
            <div class="auth-brand-panel__content">
                <div class="brand-header" aria-label="${msg('platformName')}">
                    <div class="brand-header__left">
                        <img src="${url.resourcesPath}/img/logo_bufnita.png" alt="${msg('platformName')}" class="brand-logo" />
                        <div class="brand-header__copy">
                            <span class="brand-caption">${msg("brandCaption")}</span>
                        </div>
                    </div>
                </div>

                <div class="brand-copy brand-copy--single">
                    <h1 class="brand-title">${msg("brandTitle")}</h1>
                    <p class="brand-description">${msg("brandDescription")}</p>

                    <div class="brand-benefits" aria-label="${msg('brandBenefitsLabel')}">
                        <div class="brand-benefit-card">
                            <span class="brand-benefit-card__icon" aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                            </span>
                            <span class="brand-benefit-card__copy">
                                <span>${msg("benefitCourses")}</span>
                            </span>
                        </div>
                        <div class="brand-benefit-card">
                            <span class="brand-benefit-card__icon" aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                            </span>
                            <span class="brand-benefit-card__copy">
                                <span>${msg("benefitProgress")}</span>
                            </span>
                        </div>
                        <div class="brand-benefit-card">
                            <span class="brand-benefit-card__icon" aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            </span>
                            <span class="brand-benefit-card__copy">
                                <span>${msg("benefitAccess")}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <main class="auth-form-panel">
            <div class="auth-form-stack">
                <div class="auth-aky-badge" aria-label="Aky AI Assistant">
                    <div class="auth-aky-badge__logo-shell">
                        <img src="${url.resourcesPath}/img/logo_RAG-removebg-preview.png" alt="Aky AI" class="auth-aky-badge__logo" />
                    </div>
                    <div class="auth-aky-badge__copy">
                        <span class="auth-aky-badge__eyebrow">Powered by</span>
                        <span class="auth-aky-badge__title">Aky RAG</span>
                        <span class="auth-aky-badge__subtitle">Asistent pentru materiale academice</span>
                    </div>
                </div>

                <#nested "preFormCard">

                <div class="${properties.kcFormCardClass!}">
                <header class="${properties.kcFormHeaderClass!}">
                    <div class="header-row">
                        <div>
                            <#-- eyebrow removed -->
                            <h2 id="kc-page-title" class="auth-title"><#nested "header"></h2>
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

                    <#-- login footer removed -->
                </div>
            </div>
        </main>
    </div>
</body>
</html>
</#macro>
