<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        <#if actionUri?has_content>
            ${msg("requiredActionTitle")}
        <#elseif pageRedirectUri?has_content || (client.baseUrl)?has_content>
            ${msg("accountUpdatedTitle")}
        <#elseif messageHeader??>
            ${kcSanitize(msg("${messageHeader}"))?no_esc}
        <#else>
            ${message.summary}
        </#if>
    <#elseif section = "form">
        <#assign targetUri="">
        <#if pageRedirectUri?has_content>
            <#assign targetUri=pageRedirectUri>
        <#elseif actionUri?has_content>
            <#assign targetUri=actionUri>
        <#elseif (client.baseUrl)?has_content>
            <#assign targetUri=client.baseUrl>
        </#if>

        <div id="kc-info-message" class="stack-copy info-message-shell">
            <#if actionUri?has_content>
                <p class="instruction info-message-copy">
                    ${msg("requiredActionMessage")}
                    <#if requiredActions??>
                        <span class="info-message-highlight">
                            <#list requiredActions as reqActionItem>${kcSanitize(msg("requiredAction.${reqActionItem}"))?no_esc}<#sep>, </#list>
                        </span>
                    </#if>
                </p>
            <#elseif pageRedirectUri?has_content || (client.baseUrl)?has_content>
                <p class="instruction info-message-copy">${msg("accountUpdatedMessage")}</p>
            <#else>
                <p class="instruction info-message-copy">${message.summary}</p>
            </#if>

            <#if !skipLink??>
                <#if targetUri?has_content>
                    <div class="info-message-actions">
                        <#if actionUri?has_content>
                            <a class="btn btn-primary btn-block btn-lg info-message-button" href="${targetUri}">${msg("proceedWithAction")}</a>
                        <#else>
                            <a class="btn btn-primary btn-block btn-lg info-message-button" href="${targetUri}">${msg("backToApplication")}</a>
                        </#if>
                    </div>
                </#if>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
